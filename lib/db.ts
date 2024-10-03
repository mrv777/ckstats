import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          // This runs the PRAGMA command every time a query is made
          // You might want to run this only once when the app starts instead
          //await query(`PRAGMA cache_size = -2000000;` as any) // Set to 2GB
          return query(args)
        },
      },
    },
  })
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma