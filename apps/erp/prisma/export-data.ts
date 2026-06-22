import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function exportData() {
  const series = await prisma.series.findMany()
  const works = await prisma.works.findMany()
  const products = await prisma.products.findMany()
  const skus = await prisma.productSku.findMany()
  const rawMaterials = await prisma.rawMaterial.findMany()

  const data = {
    series,
    works,
    products,
    skus,
    rawMaterials,
  }

  fs.writeFileSync('./prisma/data-backup.json', JSON.stringify(data, null, 2))
  console.log('数据导出成功')
  console.log(`Series: ${series.length}`)
  console.log(`Works: ${works.length}`)
  console.log(`Products: ${products.length}`)
  console.log(`SKUs: ${skus.length}`)
  console.log(`RawMaterials: ${rawMaterials.length}`)
}

exportData()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
