import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Helper from 'App/Common/Helper'
import Supplier from 'App/Models/Supplier'
import Excel from 'exceljs'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import Env from '@ioc:Adonis/Core/Env'
import { DateTime } from 'luxon'
import Application from '@ioc:Adonis/Core/Application'
// import { DateTime } from 'luxon'

export default class SuppliersController {
  public async create({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let payload: any = await request.validate({
      schema: schema.create({
        supplier_name: schema.string({}),
        supplier_phone_number: schema.string.optional(),
        supplier_email: schema.string.optional(),
        supplier_address: schema.string.optional(),
        supplier_description: schema.string.optional(),
        supplier_province_id: schema.number(),
        supplier_province_name: schema.string({}),
        supplier_district_id: schema.number(),
        supplier_district_name: schema.string({}),
        supplier_sub_district_id: schema.number.optional(),
        supplier_sub_district_name: schema.string.optional(),
        supplier_status: schema.enum(['active', 'inactive'] as const),
      }),
      reporter: CustomReporter,
      messages: {
        enum: "harus salah satu dari: {{ options.choices }}"
      }
    })

    try {
      payload.supplier_branch_id = auth.user?.user_branch_id
      const createSupplier = await Supplier.create(payload)

      output = {
        code: 201,
        status: 'success',
        message: 'Berhasil tambah data',
        result: createSupplier
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async index({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let params = request.all()

    try {
      let sort = params.sort ? params.sort : 'supplier_id'
      let dir = params.dir ? params.dir.toUpperCase() : 'DESC'
      let limit = params.limit ? parseInt(params.limit) : 10
      let page = params.page ? parseInt(params.page) : 1
      let start = (page - 1) * limit
      let search = params.search ? params.search : ''
      let from = `FROM suppliers`
      let queryFilter = `WHERE 1 = 1 AND supplier_branch_id = ${auth.user?.user_branch_id}`

      if (params.district_id && params.district_id.length > 0 && params.district_id !== '') {
        queryFilter += `AND supplier_district_id = '${params.district_id}'`
      }
      
      if (params.province_id && params.province_id.length > 0 && params.province_id !== '') {
        queryFilter += `AND supplier_province_id = '${params.province_id}'`
      }

      if (params.status && params.status.length > 0 && params.status !== '') {
        queryFilter += `AND supplier_status = '${params.status}'`
      }

      let whereSearch = ''
      if (search.length > 0) {
        whereSearch += `
					AND (
						supplier_name ILIKE '%${search}%' OR
						supplier_phone_number ILIKE '%${search}%' OR
						supplier_district_name ILIKE '%${search}%'
					)
				`
      }

      let sql = `
				SELECT 
					supplier_id,
          supplier_name,
          supplier_phone_number,
          supplier_email,
          supplier_address,
          supplier_description,
          supplier_province_id,
          supplier_province_name,
          supplier_district_id,
          supplier_district_name,
          supplier_sub_district_id,
          supplier_sub_district_name,
          supplier_status,
          supplier_created_at,
          supplier_updated_at,
          supplier_branch_id,
          branch_name
				${from}
        LEFT JOIN branches ON supplier_branch_id = branch_id
				${queryFilter} ${whereSearch}
				ORDER BY ${sort} ${dir}
				LIMIT ${limit} OFFSET ${start}
			`

      let sqlTotal = `
				SELECT 1 as total 
				${from}
        LEFT JOIN branches ON supplier_branch_id = branch_id
				${queryFilter} ${whereSearch}
			`
      let result: any = await Database.rawQuery(sql)
      let totalRow = await Database.rawQuery(sqlTotal)
      let resultData = result.rowCount > 0 ? result.rows : []

      output = {
        code: 200,
        status: 'success',
        message: 'List data',
        result: {
          meta: Helper.pagination(totalRow.rowCount, page, limit),
          data: Helper.sanitizationResponse(resultData)
        }
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async detail({ request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let id: number = request.params().id
    try {
      const detail = await Database
        .query()
        .from('suppliers')
        .where('supplier_id', id)
        .firstOrFail()
      output = {
        code: 200,
        status: 'success',
        message: 'Detail data',
        result: Helper.sanitizationResponse(detail)
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async update({ request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      data: {}
    }

    let payload: any = await request.validate({
      schema: schema.create({
        supplier_id: schema.number(),
        supplier_name: schema.string({}),
        supplier_email: schema.string.optional(),
        supplier_phone_number: schema.string.optional(),
        supplier_address: schema.string.optional(),
        supplier_description: schema.string.optional(),
        supplier_province_id: schema.number(),
        supplier_province_name: schema.string({}),
        supplier_district_id: schema.number(),
        supplier_district_name: schema.string({}),
        supplier_sub_district_id: schema.number.optional(),
        supplier_sub_district_name: schema.string.optional(),
        supplier_status: schema.enum(['active', 'inactive'] as const),
      })
    })

    try {
      await Supplier
        .query()
        .where('supplier_id', payload.supplier_id)
        .update(payload)

      output = {
        code: 201,
        status: 'success',
        message: 'Berhasil ubah data',
        data: payload
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async delete({ request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let payload: any = await request.validate({
      schema: schema.create({
        supplier_id: schema.number()
      }),
      reporter: CustomReporter
    })

    try {
      await Supplier.query().where('supplier_id', payload.supplier_id).delete()
      output = {
        code: 201,
        status: 'success',
        message: 'Berhasil hapus data'
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }
    return response.status(200).json(output)
  }

  public async export({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    let params = request.all()
    let search = params.search ? params.search : ''
    let branch_name = 'All'

    let from = `FROM suppliers`
    let queryFilter = `WHERE 1 = 1 AND supplier_branch_id = ${auth.user?.user_branch_id}`

    if (params.district_id && params.district_id.length > 0 && params.district_id !== '') {
      queryFilter += `AND supplier_district_id = '${params.district_id}'`
    }

    if (params.province_id && params.province_id.length > 0 && params.province_id !== '') {
      queryFilter += `AND supplier_province_id = '${params.province_id}'`
    }

    if (params.status && params.status.length > 0 && params.status !== '') {
      queryFilter += `AND supplier_status = '${params.status}'`
    }

    let whereSearch = ''
    if (search.length > 0) {
      whereSearch += `
					AND (
						supplier_name ILIKE '%${search}%' OR
						supplier_phone_number ILIKE '%${search}%' OR
						supplier_district_name ILIKE '%${search}%'
					)
				`
    }

    let sql = `
				SELECT 
					supplier_id,
          supplier_name,
          supplier_phone_number,
          supplier_email,
          supplier_address,
          supplier_description,
          supplier_province_id,
          supplier_province_name,
          supplier_district_id,
          supplier_district_name,
          supplier_sub_district_id,
          supplier_sub_district_name,
          supplier_status,
          supplier_created_at,
          supplier_updated_at
				${from}
				${queryFilter} ${whereSearch}
			`

    let result: any = await Database.rawQuery(sql)
    let resultData: any = result.rowCount > 0 ? result.rows : []

    if (result.rowCount > 0) {
      try {
        let workbook = new Excel.Workbook()
        let worksheet = workbook.addWorksheet("Sheet 1")
        let font = { name: 'Arial', size: 10 }

        worksheet.mergeCells('A1', 'M1')
        worksheet.mergeCells('A2', 'M2')
        worksheet.mergeCells('A3', 'M3')
        worksheet.mergeCells('A4', 'M4')
        worksheet.mergeCells('A5', 'M5')

        worksheet.getCell('A1').value = 'Mataram Textile'
        worksheet.getCell('A2').value = 'Data Supplier'
        worksheet.getCell('A3').value = '-'
        worksheet.getCell('A4').value = '-'
        worksheet.getCell('A5').value = 'Tags : ' + branch_name

        worksheet.getCell('A1').alignment = {
          vertical: "middle", horizontal: "center"
        }
        worksheet.getCell('A2').alignment = {
          vertical: "middle", horizontal: "center"
        }

        worksheet.getCell('A3').alignment = {
          vertical: "middle", horizontal: "center"
        }
        worksheet.getCell('A4').alignment = {
          vertical: "middle", horizontal: "center"
        }
        worksheet.getCell('A5').alignment = {
          vertical: "middle", horizontal: "center"
        }

        worksheet.getCell('A1').font = {
          name: 'Arial',
          size: 10,
          bold: true
        };
        worksheet.getCell('A2').font = {
          name: 'Arial',
          size: 12,
          bold: true
        };
        worksheet.getCell('A5').font = {
          name: 'Arial',
          size: 10,
          bold: true
        };

        worksheet.getRow(6).values = [
          "No",
          "Nama Suplier",
          "No Telepon",
          "Email",
          "Alamat",
          "Kota",
          "Provinsi",
          "Status"
        ];

        worksheet.columns = [
          { header: "No.", key: "no", width: 5, style: { font } },
          { header: "Nama Suplier", key: "supplier_name", width: 30, style: { font } },
          { header: "No Telepon", key: "supplier_phone_number", width: 30, style: { font } },
          { header: "Email", key: "supplier_email", width: 30, style: { font } },
          { header: "Alamat", key: "supplier_address", width: 25, style: { font } },
          { header: "Kota", key: "supplier_district_name", width: 20, style: { font } },
          { header: "Provinsi", key: "supplier_province_name", width: 20, style: { font } },
          { header: "Status", key: "supplier_status", width: 20, style: { font } }
        ]

        worksheet.getRow(6).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'ECF0F1' },
        }

        worksheet.getRow(6).font = {
          name: 'Arial',
          size: 10,
          bold: true
        }

        let no = 1
        resultData.map(async (item: any) => {
          worksheet.addRow({
            no: no,
            supplier_name: item.supplier_name,
            supplier_phone_number: item.supplier_phone_number,
            supplier_email: item.supplier_email,
            supplier_address: item.supplier_address,
            supplier_district_name: item.supplier_district_name,
            supplier_province_name: item.supplier_province_name,
            supplier_status: item.supplier_status
          })
          no++
        })

        let datetime = DateTime.local().toFormat('yyyy-MM-dd_HHmmss')
        let path: string = `Data_Supplier_Export_${datetime}.xlsx`

        await workbook.xlsx.writeFile(Application.tmpPath('uploads/' + path))

        output = {
          code: 200,
          status: 'success',
          message: 'Download Excel',
          result: {
            data: {
              url: Env.get('APP_URL') + '/files/download/' + path
            }
          }
        }
      } catch (error) {
        output.message = error.message
        output.code = 500
      }
    }

    return response.status(200).json(output)
  }

  public async exportAccurate({ auth, response }: HttpContextContract) {
		let output: any = {
			code: 400,
			status: 'error',
			message: 'Bad Request',
			result: {}
		}

		// let params = request.all()
    // let arrayId = params.arrayId
    let queryFilter = `WHERE 1 = 1 AND supplier_branch_id = ${auth.user?.user_branch_id}`

    // if(arrayId !== 'all'){
    //   queryFilter += ` AND supplier_id IN (${arrayId})`
    // }

    let sql = `
      SELECT 
       suppliers.*
      FROM suppliers
      ${queryFilter}
      ORDER BY supplier_id ASC
    `

		let result: any = await Database.rawQuery(sql)
		let resultData: any = result.rowCount > 0 ? result.rows : []
    let newArr: any = []

		if (result.rowCount > 0) {
      for (let i in resultData) {
        resultData[i].saldo_first_date = DateTime.local().toFormat('dd/MM/yyyy')
        newArr.push(resultData[i])
      }

			try {
				let workbook = new Excel.Workbook()
				let worksheet = workbook.addWorksheet("Sheet 1")
				let font = { name: 'Arial', size: 13 }

				worksheet.columns = [
					{ header: "Category", key: "", width: 15, style: { font } },
					{ header: "Supplier ID", key: "supplier_id", width: 15, style: { font } },
					{ header: "Name", key: "supplier_name", width: 25, style: { font } },
					{ header: "Contact", key: "", width: 15, style: { font } },
					{ header: "Business Phone", key: "", width: 15, style: { font } },
					{ header: "Mobile Phone", key: "supplier_phone_number", width: 25, style: { font } },
					{ header: "Fax number", key: "", width: 15, style: { font } },
					{ header: "Email", key: "supplier_email", width: 20, style: { font } },
					{ header: "Website", key: "", width: 15, style: { font } },
					{ header: "As of Opening Balance", key: "", width: 15, style: { font } },
					{ header: "Base Currency", key: "", width: 15, style: { font } },
					{ header: "Opening Balance", key: "", width: 15, style: { font } },
					{ header: "Opening Balance Currency", key: "base_currency", width: 15, style: { font } },
					{ header: "Opening Balance Rate (If Foreign)", key: "", width: 15, style: { font } },
					{ header: "Opening Balance Invoice Number", key: "", width: 15, style: { font } },
					{ header: "Opening Balance Branch", key: "", width: 15, style: { font } },
					{ header: "Opening Balance Term", key: "", width: 15, style: { font } },
					{ header: "Character 1", key: "", width: 15, style: { font } },
					{ header: "Character 2", key: "", width: 15, style: { font } },
					{ header: "Character 3", key: "", width: 15, style: { font } },
					{ header: "Character 4", key: "", width: 15, style: { font } },
					{ header: "Character 5", key: "", width: 15, style: { font } },
					{ header: "Character 6", key: "", width: 15, style: { font } },
					{ header: "Character 7", key: "", width: 15, style: { font } },
					{ header: "Character 8", key: "", width: 15, style: { font } },
					{ header: "Character 9", key: "", width: 15, style: { font } },
					{ header: "Character 10", key: "", width: 15, style: { font } },
					{ header: "Number 1", key: "", width: 15, style: { font } },
					{ header: "Number 2", key: "", width: 15, style: { font } },
					{ header: "Number 3", key: "", width: 15, style: { font } },
					{ header: "Number 4", key: "", width: 15, style: { font } },
					{ header: "Number 5", key: "", width: 15, style: { font } },
					{ header: "Number 6", key: "", width: 15, style: { font } },
					{ header: "Number 7", key: "", width: 15, style: { font } },
					{ header: "Number 8", key: "", width: 15, style: { font } },
					{ header: "Number 9", key: "", width: 15, style: { font } },
					{ header: "Number 10", key: "", width: 15, style: { font } },
					{ header: "Date 1", key: "", width: 15, style: { font } },
					{ header: "Date 2", key: "", width: 15, style: { font } },
					{ header: "Billing Address", key: "", width: 15, style: { font } },
					{ header: "City", key: "supplier_district_name", width: 25, style: { font } },
					{ header: "Province", key: "supplier_province_name", width: 25, style: { font } },
					{ header: "Country", key: "country", width: 20, style: { font } },
					{ header: "Zip Code", key: "", width: 15, style: { font } },
					{ header: "Term", key: "", width: 15, style: { font } },
					{ header: "NPWP", key: "", width: 15, style: { font } },
					{ header: "Tax Payer Name", key: "", width: 15, style: { font } },
					{ header: "NPPKP", key: "", width: 15, style: { font } },
					{ header: "Tax Type", key: "", width: 15, style: { font } },
					{ header: "Used in branch", key: "", width: 15, style: { font } },
					{ header: "Description default", key: "supplier_description", width: 25, style: { font } },
					{ header: "Payable account", key: "", width: 15, style: { font } },
					{ header: "Down Payment account", key: "", width: 15, style: { font } },
					{ header: "Invoice Default tax included", key: "", width: 15, style: { font } },
					{ header: "Tax Address", key: "", width: 15, style: { font } },
					{ header: "City (Tax)", key: "", width: 15, style: { font } },
					{ header: "Province (Tax)", key: "", width: 15, style: { font } },
					{ header: "Country (Tax)", key: "", width: 15, style: { font } },
					{ header: "Zip Code (Tax)", key: "", width: 15, style: { font } },
					{ header: "Document Code", key: "", width: 15, style: { font } },
					{ header: "Notes", key: "", width: 15, style: { font } },
					{ header: "Vendor Type", key: "", width: 15, style: { font } },
					{ header: "Suspended", key: "supplier_suspend", width: 15, style: { font } },
				]

        newArr.map(async (item: any) => {
					worksheet.addRow({
						supplier_id: item.supplier_id,
						supplier_name: item.supplier_name,
            supplier_email: item.supplier_email,
            supplier_phone_number: item.supplier_phone_number,
						base_currency: "IDR",
            country: "Indonesia",
            supplier_province_name: item.supplier_province_name,
            supplier_district_name: item.supplier_district_name,
            supplier_sub_district_name: item.supplier_sub_district_name,
            supplier_description: item.supplier_description,
            supplier_suspend: item.supplier_status == 'active' ? 'No' : 'Yes',
					})
				})

        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '69BE28' },
        }

        worksheet.getRow(1).font = {
          name: 'Arial',
          size: 14,
          bold: true
        }

        let datetime = DateTime.local().toFormat('yyyy-MM-dd_HHmmss')
				let path: string = `Supplier_Accurate_${datetime}.xlsx`

				await workbook.xlsx.writeFile(Application.tmpPath('uploads/' + path))

				output = {
					code: 200,
					status: 'success',
					message: 'Download Excel',
					result: {
						data: {
							url: Env.get('APP_URL') + '/files/download/' + path
						}
					}
				}
			} catch (error) {
				output.message = error.message
				output.code = 500
			}
    }else{
      output.code = 404
      output.status = 'error'
      output.message = 'Data tidak ditemukan!'
		}
    

		return response.status(200).json(output)
	}

}