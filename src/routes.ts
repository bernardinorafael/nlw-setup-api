import dayjs from 'dayjs'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { prisma } from './lib/prisma'

export async function appRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const habits = await prisma.habit.findMany()

    return reply.status(200).send({ habits })
  })

  app.get('/day', async (req, reply) => {
    const getDayParams = z.object({
      date: z.coerce.date(),
    })

    const body = getDayParams.parse(req.query)

    const parsedDate = dayjs(body.date).startOf('day')
    const weekDay = dayjs(parsedDate).get('day')

    const possibleHabits = await prisma.habit.findMany({
      where: {
        created_at: {
          lte: body.date,
        },

        weekDays: {
          some: {
            week_day: weekDay,
          },
        },
      },
    })

    const day = await prisma.day.findFirst({
      where: {
        date: parsedDate.toDate(),
      },
      include: {
        dayHabits: true,
      },
    })

    const completedHabits = day?.dayHabits.map((dayHabit) => dayHabit.habit_id) ?? []

    return reply.status(200).send({
      possibleHabits,
      completedHabits,
    })
  })

  app.post('/', async (req, reply) => {
    const createHabitBody = z.object({
      title: z.string(),
      weekDays: z.array(z.number().min(0).max(6)),
    })

    const body = createHabitBody.parse(req.body)

    const today = dayjs().startOf('day').toDate()

    await prisma.habit.create({
      data: {
        title: body.title,
        created_at: today,
        weekDays: {
          create: body.weekDays.map((weekDay) => {
            return {
              week_day: weekDay,
            }
          }),
        },
      },
    })

    return reply.status(201).send()
  })

  app.patch('/:id/toggle', async (req, reply) => {
    const toggleHabitParams = z.object({
      id: z.string().uuid(),
    })

    const params = toggleHabitParams.parse(req.params)

    const today = dayjs().startOf('day').toDate()

    let day = await prisma.day.findUnique({
      where: {
        date: today,
      },
    })

    if (!day) {
      day = await prisma.day.create({
        data: {
          date: today,
        },
      })
    }

    const dayHabit = await prisma.dayHabit.findUnique({
      where: {
        day_id_habit_id: {
          day_id: day.id,
          habit_id: params.id,
        },
      },
    })

    if (dayHabit) {
      await prisma.dayHabit.delete({
        where: { id: dayHabit.id },
      })
    } else {
      await prisma.dayHabit.create({
        data: {
          day_id: day.id,
          habit_id: params.id,
        },
      })
    }

    return reply.status(200).send()
  })

  app.get('/summary', async (req, reply) => {
    const summary = await prisma.$queryRaw`
      SELECT 
        D.id, 
        D.date,
        (
          SELECT 
            cast(count(*) as float)
          FROM day_habits DH
          WHERE DH.day_id = D.id
        ) as completed,
        (
          SELECT
            cast(count(*) as float)
          FROM habit_week_days HWD
          JOIN habits H
            ON H.id = HWD.habit_id
          WHERE
            HWD.week_day = cast(strftime('%w', D.date/1000.0, 'unixepoch') as int)
            AND H.created_at <= D.date
        ) as amount
      FROM days D
    `

    return reply.status(200).send({ summary })
  })
}
