import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcrypt'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@cookreels.com'
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!'

  if (!process.env.ADMIN_PASSWORD) {
    console.warn(`⚠️  ADMIN_PASSWORD not set — using default password "${password}". Change it after first login.`)
  }

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {},
    create: {
      name: 'Super Admin',
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  })

  console.log(`✅ SUPER_ADMIN ready: ${admin.email}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
