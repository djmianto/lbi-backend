// import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
// import { schema } from '@ioc:Adonis/Core/Validator'
// import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
// import Application from '@ioc:Adonis/Core/Application'
// import Excel from 'exceljs'
// import ProductCategory from 'App/Models/ProductCategory'
// import MasterProduct from 'App/Models/MasterProduct'
// import MasterProductCategory from 'App/Models/MasterProductCategory'
// import BranchProduct from 'App/Models/BranchProduct'
// import Transaction from 'App/Models/Transaction'
// import User from 'App/Models/User'
// import Branch from 'App/Models/Branch'
// import moment from 'moment-timezone'
// import Helper from 'App/Common/Helper'

export default class ImportBulksController {
  // public async importMasterProduct({ request, response }: HttpContextContract) {
  //   let output: any = {
  //     code: 400,
  //     status: 'error',
  //     message: 'Bad Request',
  //     result: {}
  //   }

  //   let payload: any = {}

  //   try {
  //     payload = await request.validate({
  //       schema: schema.create({
  //         file_excel: schema.file({
  //           size: '20mb',
  //           extnames: ['xlsx', 'xls'],
  //         })
  //       }),
  //       reporter: CustomReporter
  //     })
  //   } catch (error) {
  //     return response.status(200).json(error.messages)
  //   }

  //   try {

  //     await payload.file_excel.move(Application.tmpPath('uploads'), {
  //       name: `${new Date().getTime()}.${payload.file_excel.extname}`
  //     })

  //     const workbook = new Excel.Workbook()
  //     await workbook.xlsx.readFile(payload.file_excel.filePath)

  //     let worksheet = workbook.getWorksheet('Sheet1')

  //     //grab all data from worksheet
  //     let rawData: any = []

  //     worksheet.getColumn('A').eachCell(async (cell, rowNumber) => {
  //       if (rowNumber > 1) {
  //         let sku = worksheet.getCell('A' + rowNumber).value
  //         let productName = worksheet.getCell('B' + rowNumber).value
  //         let category = worksheet.getCell('C' + rowNumber).value
  //         let subCategory = worksheet.getCell('D' + rowNumber).value
  //         let packaging = worksheet.getCell('E' + rowNumber).value
  //         let weight = worksheet.getCell('F' + rowNumber).value
  //         let description = worksheet.getCell('G' + rowNumber).value
  //         let status = worksheet.getCell('H' + rowNumber).value
  //         let images = worksheet.getCell('I' + rowNumber).value
  //         // let type = worksheet.getCell('J' + rowNumber).value

  //         let arrCategory = category ? category.toString().split(",") : []

  //         if (arrCategory.length > 1) {
  //           arrCategory = [...new Set(arrCategory)]
  //         }

  //         let arrSubCategory = subCategory ? subCategory.toString().split(",") : []

  //         if (arrSubCategory.length > 1) {
  //           arrSubCategory = [...new Set(arrSubCategory)]
  //         }

  //         const allStatus: any = ['active', 'inactive']

  //         if (!allStatus.includes(status)) {
  //           status = 'active'
  //         }

  //         // const allType: any = ['private', 'public']
  //         // if (!allType.includes(type)) {
  //         //   type = 'public'
  //         // }

  //         rawData.push({
  //           sku,
  //           productName,
  //           category: arrCategory,
  //           subCategory: arrSubCategory,
  //           packaging,
  //           weight,
  //           description,
  //           status,
  //           images
  //         })
  //       } else {
  //         console.log('pakai param biar tidak error', cell.value)
  //       }
  //     })

  //     console.log('validation aman terkendali (sku, nama, & category) tidak kosong')


  //     let count = 0
  //     // console.log(`total data: ${rawData.length}`)
  //     await Promise.all(rawData.map(async (item: any) => {
  //       return MasterProduct.create({
  //         product_sku: item.sku ? item.sku : '',
  //         product_name: item.productName ? item.productName : '',
  //         product_packaging: item.packaging ? item.packaging : '',
  //         product_desc: item.description ? item.description : '',
  //         product_selling_unit: item.weight ? item.weight : 0,
  //         product_photo: item.images ? item.images : '',
  //         product_status: item.status,
  //         // product_type: item.type
  //       }).then((createProduct) => {
  //         count++
  //         item.category.forEach((itemCat: string) => {
  //           let categoryName = itemCat.trim()

  //           ProductCategory.create({
  //             category_parent_id: 0,
  //             category_name: categoryName,
  //           }).then((addProductCategory) => {

  //             MasterProductCategory.create({
  //               product_category_category_id: addProductCategory.$attributes.category_id,
  //               product_category_product_id: createProduct.$attributes.product_id
  //             })

  //           }).catch((error) => {
  //             if (error.code == 23505) {
  //               ProductCategory.findBy('category_name', categoryName)
  //                 .then((foundProductCategory) => {
  //                   if (foundProductCategory) {
  //                     MasterProductCategory.create({
  //                       product_category_category_id: foundProductCategory.$attributes.category_id,
  //                       product_category_product_id: createProduct.$attributes.product_id
  //                     })
  //                   }
  //                 })
  //             }
  //           })
  //         })

  //         // ProductPackage.create({
  //         //   product_package_name: item.packaging.toString(),
  //         // }).catch((error) => {
  //         //   if (error.code == 23505) {
  //         //     // console.log(`packaging '${item.packaging.toString()}' sudah ada, nggak jadi di insert`)
  //         //   }
  //         // })
  //       }).catch((error) => {
  //         if (error.code == 23505) {
  //           console.log(`sku '${item.sku}' sudah ada, nggak jadi di insert`)
  //         }
  //       })
  //     }))

  //     output = {
  //       code: 200,
  //       status: 'success',
  //       message: `${count}/${rawData.length} produk master ditambahkan dari file excel`,
  //       result: {
  //         data: {}
  //       }
  //     }
  //   } catch (err) {
  //     output.message = err.message
  //     output.code = 500
  //   }

  //   return response.status(200).json(output)
  // }

  // public async importBranchProduct({ request, response }: HttpContextContract) {
  //   console.log('a')
  //   let output: any = {
  //     code: 400,
  //     status: 'error',
  //     message: 'Bad Request',
  //     result: {}
  //   }

  //   let payload: any = {}

  //   try {
  //     payload = await request.validate({
  //       schema: schema.create({
  //         file_excel: schema.file({
  //           size: '8mb',
  //           extnames: ['xlsx', 'xls'],
  //         })
  //       }),
  //       reporter: CustomReporter
  //     })
  //   } catch (error) {
  //     return response.status(200).json(error.messages)
  //   }

  //   try {

  //     await payload.file_excel.move(Application.tmpPath('uploads'), {
  //       name: `${new Date().getTime()}.${payload.file_excel.extname}`
  //     })
  //     console.log('e')
  //     const workbook = new Excel.Workbook()
  //     await workbook.xlsx.readFile(payload.file_excel.filePath)

  //     let worksheet = workbook.getWorksheet('Sheet1')

  //     //grab all data from worksheet
  //     let rawData: any = []

  //     worksheet.getColumn('A').eachCell(async (cell, rowNumber) => {
  //       if (rowNumber > 1) {
  //         let branchId = worksheet.getCell('A' + rowNumber).value
  //         let branchName = worksheet.getCell('B' + rowNumber).value
  //         let productId = worksheet.getCell('C' + rowNumber).value
  //         let productName = worksheet.getCell('D' + rowNumber).value
  //         let productStock = worksheet.getCell('E' + rowNumber).value
  //         let discountPercent = worksheet.getCell('F' + rowNumber).value
  //         let discountNominal = worksheet.getCell('G' + rowNumber).value
  //         let sellPrice = worksheet.getCell('H' + rowNumber).value
  //         let hpp = worksheet.getCell('I' + rowNumber).value

  //         // if (isExclude == 0) {
  //         //   const allType: any = ['private', 'public']
  //         //   if (!allType.includes(type)) {
  //         //     type = 'public'
  //         //   }

  //           rawData.push({
  //             branchId,
  //             branchName,
  //             productId,
  //             productName,
  //             productStock: productStock ? productStock : 0,
  //             discountPercent: discountPercent ? discountPercent : 0,
  //             discountNominal: discountNominal ? discountNominal : 0,
  //             sellPrice: sellPrice ? sellPrice : 0,
  //             hpp: hpp ? hpp : 0
  //           })
  //         // }
  //       } else {
  //         console.log('pakai param biar tidak error', cell.value)
  //       }
  //     })

  //     let count = 0
  //     console.log(rawData.length)
  //     await Promise.all(rawData.map(async (item: any) => {
  //       return BranchProduct.create({
  //         branch_product_branch_id: item.branchId,
  //         branch_product_product_id: item.productId,
  //         branch_product_stock: item.productStock,
  //         branch_product_hpp: item.hpp,
  //         branch_product_sell_price: item.sellPrice,
  //         branch_product_disc_percent: item.discountPercent,
  //         branch_product_sale_price: item.discountNominal,
  //         branch_product_status: 'active',
  //       })
  //     }))

  //     output = {
  //       code: 200,
  //       status: 'success',
  //       message: `${count}/${rawData.length} branch produk ditambahkan dari file excel`,
  //       result: {
  //         data: {}
  //       }
  //     }
  //   } catch (err) {
  //     output.message = err.message
  //     output.code = 500
  //   }

  //   return response.status(200).json(output)
  // }

}
