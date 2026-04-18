import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const result = await prisma.thread.updateMany({ data: { read: true } })
console.log('Marked as read:', result.count)
await prisma.$disconnect()