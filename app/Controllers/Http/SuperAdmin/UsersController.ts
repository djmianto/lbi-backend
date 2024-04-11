import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import Env from '@ioc:Adonis/Core/Env'
import User from 'App/Models/User'
import UserAddress from 'App/Models/UserAddress'
import Helper from 'App/Common/Helper'
import Database from '@ioc:Adonis/Lucid/Database'
import { DateTime } from 'luxon'
import Excel from 'exceljs'
import Hash from '@ioc:Adonis/Core/Hash'
import Application from '@ioc:Adonis/Core/Application'

export default class UsersController {
  public async create({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    let payload: any = {}

    try {
      payload = await request.validate({
        schema: schema.create({
          user_full_name: schema.string(),
          user_address: schema.string.optional(),
          user_address_province_id: schema.number.optional(),
          user_address_province_name: schema.string.optional(),
          user_address_district_id: schema.number.optional(),
          user_address_district_name: schema.string.optional(),
          user_phone_number: schema.string.optional([
            rules.unique({ table: 'users', column: 'user_phone_number' })
          ]),
          user_email: schema.string.optional([
            rules.unique({ table: 'users', column: 'user_email' })
          ]),
          user_status: schema.enum(['active', 'inactive'] as const),
        }),
        reporter: CustomReporter,
        messages: {
          enum: "harus salah satu dari: {{ options.choices }}"
        }
      })
    } catch (error) {
      return response.status(200).json(error.messages)
    }

    try {
      //create user
      const createCustomer = await User.create({
        user_full_name: payload.user_full_name,
        user_phone_number: payload.user_phone_number,
        user_email: payload.user_email,
        user_firebase_uid: payload.user_firebase_uid,
        user_role: 'customer',
        user_status: payload.user_status,
        user_branch_id: auth.user?.user_branch_id,
        user_join_date: payload.user_join_date ? payload.user_join_date : DateTime.local().toFormat('yyyy-MM-dd')
      })

      //create address
      await UserAddress.create({
        address_user_id: createCustomer.$attributes?.user_id,
        address_title: 'Alamat Utama',
        address_full: payload.user_address,
        address_province_id: payload.user_address_province_id,
        address_province_name: payload.user_address_province_name,
        address_district_id: payload.user_address_district_id,
        address_district_name: payload.user_address_district_name,
        // address_sub_district_id: payload.user_address_sub_district_id,
        // address_sub_district_name: payload.user_address_sub_district_name,
      })

      let phoneNumber = payload.user_phone_number;

      if(phoneNumber){
        if (phoneNumber.startsWith("08")) {
          phoneNumber = phoneNumber.replace("08", "+628");
        }
        if (phoneNumber.startsWith("8")) {
          phoneNumber = phoneNumber.replace("8", "+628");
        }
      }

      output = {
        code: 201,
        status: 'success',
        message: 'Berhasil tambah data',
        result: {
          data: Helper.sanitizationResponse(createCustomer)
        }
      }
    } catch (error) {
      output.message = error.message
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
      let sort = params.sort ? params.sort : 'user_id'
      let dir = params.dir ? params.dir.toUpperCase() : 'DESC'
      let limit = params.limit ? parseInt(params.limit) : 10
      let page = params.page ? parseInt(params.page) : 1
      let start = (page - 1) * limit

      let queryLimit = limit < 0 ? '' : `LIMIT ${limit} OFFSET ${start}`
      let search = params.search ? params.search : ''
      let queryFilter = `WHERE 1 = 1 
        AND user_role = 'customer' 
        AND user_is_deleted = 0
        AND user_branch_id = ${auth.user?.user_branch_id}`

      let whereSearch = ''
      if (search.length > 0) {
        whereSearch += `
				AND (
            user_full_name ILIKE '%${search}%' OR
						user_phone_number ILIKE '%${search}%' OR
						user_email ILIKE '%${search}%'
				) `
      }

      if (params.status && params.status.length > 0 && params.status !== '') {
        queryFilter += ` AND user_status = '${params.status}'`
      }

      let sql = `
				SELECT 
          user_id,
          user_email,
          user_phone_number,
          user_full_name,
          user_role,
          user_join_date,
          user_status,
          user_branch_id,
          branch_name,
          address_id,
          address_title,
          address_full,
          address_province_id,
          address_province_name,
          address_district_id,
          address_district_name
				FROM users
        LEFT JOIN user_addresses ON address_user_id = user_id
        LEFT JOIN branches ON branch_id = user_branch_id
				${queryFilter} ${whereSearch}
				ORDER BY ${sort} ${dir}
				${queryLimit}
			`

      let sqlTotal = `
				SELECT 1 as total
				FROM users
        LEFT JOIN user_addresses ON address_user_id = user_id
        LEFT JOIN branches ON branch_id = user_branch_id
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

  public async update({ request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    let payload: any = {}

    payload = await request.validate({
      schema: schema.create({
        user_id: schema.number([rules.exists({ table: 'users', column: 'user_id' })]),
        user_full_name: schema.string(),
        user_address_id: schema.number([rules.exists({ table: 'user_addresses', column: 'address_id' })]),
        user_address: schema.string.optional(),
        user_address_province_id: schema.number.optional(),
        user_address_province_name: schema.string.optional(),
        user_address_district_id: schema.number.optional(),
        user_address_district_name: schema.string.optional(),
        user_phone_number: schema.string.optional({}),
        user_email: schema.string.optional({}),
        user_status: schema.enum(['active', 'inactive'] as const),
      }),
      reporter: CustomReporter,
      messages: {
        enum: "harus salah satu dari: {{ options.choices }}"
      }
    })
   
    try {
      //update user
      await User
        .query()
        .where('user_id', payload.user_id)
        .update({
          user_full_name: payload.user_full_name,
          user_phone_number: payload.user_phone_number,
          user_email: payload.user_email,
          user_status: payload.user_status,
        })

      //update addresss
      await UserAddress
        .query()
        .where('address_id', payload.user_address_id)
        .update({
          address_full: payload.user_address,
          address_province_id: payload.user_address_province_id,
          address_province_name: payload.user_address_province_name,
          address_district_id: payload.user_address_district_id,
          address_district_name: payload.user_address_district_name,
        })

      let phoneNumber = payload.user_phone_number;

      if(phoneNumber){
        if (phoneNumber.startsWith("08")) {
          phoneNumber = phoneNumber.replace("08", "+628");
        }
        if (phoneNumber.startsWith("8")) {
          phoneNumber = phoneNumber.replace("8", "+628");
        }
      }

      output = {
        code: 200,
        status: 'success',
        message: 'Berhasil ubah data',
        result: payload
      }
    } catch (error) {
      output.message = error.message
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

    let payload: any = {}

    try {
      payload = await request.validate({
        schema: schema.create({
          user_id: schema.number([rules.exists({ table: 'users', column: 'user_id' })]),
        }),
        reporter: CustomReporter,
        messages: {
          enum: "harus salah satu dari: {{ options.choices }}"
        }
      })
    } catch (error) {
      return response.status(200).json(error.messages)
    }

    try {
      //update user
      await User
        .query()
        .where('user_id', payload.user_id)
        .update({
          user_is_deleted: 1,
        })

      output = {
        code: 200,
        status: 'success',
        message: 'Berhasil hapus data',
        result: payload
      }
    } catch (error) {
      output.message = error.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async detail({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    let id: number = request.params().id

    try {
      let sql = `
				SELECT 
          user_id,
          user_email,
          user_phone_number,
          user_full_name,
          user_role,
          user_join_date,
          user_status,
          user_created_at,
          user_branch_id,
          branch_name,
          address_id,
          address_title,
          address_full,
          address_province_id,
          address_province_name,
          address_district_id,
          address_district_name
				FROM users
        LEFT JOIN user_addresses ON address_user_id = user_id
        LEFT JOIN branches ON branch_id = user_branch_id
				WHERE user_id = '${id}'
        AND user_branch_id = '${auth.user?.user_branch_id}'
			`

      let result: any = await Database.rawQuery(sql)
      let resultData = result.rowCount > 0 ? result.rows[0] : {}

      output = {
        code: 200,
        status: 'success',
        message: 'Detail data',
        result: Helper.sanitizationResponse(resultData)
      }
    } catch (error) {
      output.message = error.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async profile({ auth, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let id: number = auth.user?.user_id

    try {
      let sql = `
        SELECT user_id,
          user_name,
          user_email,
          user_phone_number,
          user_full_name,
          user_role,
          user_join_date,
          user_status,
          user_gender,
          user_branch_id,
          branch_name,
          address_id,
          address_title,
          address_full,
          address_province_id,
          address_province_name,
          address_district_id,
          address_district_name
        FROM users
        LEFT JOIN user_addresses ON address_user_id = user_id
        LEFT JOIN branches ON user_branch_id = branch_id
        WHERE user_id = '${id}'
      `

      let result: any = await Database.rawQuery(sql)
      let resultData = result.rowCount > 0 ? result.rows[0] : {}
 
      output = {
        code: 200,
        status: 'success',
        message: 'Detail data',
        result: Helper.sanitizationResponse(resultData)
      }
    } catch (error) {
      output.message = error.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async updateProfile({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let payload: any = await request.validate({
      schema: schema.create({
        // user_email: schema.string({}),
        user_email: schema.string({ escape: true, trim: true }, [
          rules.email({
            sanitize: true,
            ignoreMaxLength: true,
            domainSpecificValidation: true,
          }),
          rules.unique({ table: 'users', column: 'user_email' })
        ]),
        user_phone_number: schema.string({ escape: true, trim: true }),
        user_full_name: schema.string(),
      }),
      reporter: CustomReporter,
      messages: {
        enum: "harus salah satu dari: {{ options.choices }}"
      }
    })

    try {
      let dataUser: any = {
        user_email: payload.user_email,
        user_phone_number: payload.user_phone_number,
        user_full_name: payload.user_full_name,
      }

      //update user
      await User
        .query()
        .where('user_id', auth.user?.user_id)
        .update(dataUser)

      output = {
        code: 201,
        status: 'success',
        message: 'Berhasil Ubah data',
        result: payload
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async updatePassword({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let payload: any = await request.validate({
      schema: schema.create({
        password: schema.string({}),
        confirm_password: schema.string({}),
      }),
      reporter: CustomReporter,
      messages: {
        enum: "harus salah satu dari: {{ options.choices }}"
      }
    })

    try {
      if (payload.password !== payload.confirm_password) {
        output.message = 'Password tidak sama'
        output.code = 500
        return response.status(200).json(output)
      }

      if (payload.password) {
        payload.password = await Hash.make(payload.password)
      }

      //update user
      await User
        .query()
        .where('user_id', auth.user?.user_id)
        .update('user_password', payload.password)

      output = {
        code: 201,
        status: 'success',
        message: 'Berhasil ubah password',
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async exportExcel({ request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
  
    let params = request.all()
  
    let search = params.search ? params.search : ''
    let queryFilter = `WHERE 1 = 1 AND user_status = 'active'  `
    let user_role = 'all'
    if (params.user_role && params.user_role.length > 0) {
      queryFilter += `AND user_role = '${params.user_role}'`
      user_role = params.user_role
    }
    if (params.join_date && params.join_date.length > 0) {
      queryFilter += `AND DATE(user_created_at) = '${params.join_date}'`
    }
  
    let whereSearch = ''
    if (search.length > 0) {
      whereSearch += `
      AND (
          user_full_name ILIKE '%${search}%' OR
          user_email ILIKE '%${search}%' OR
          user_phone_number ILIKE '%${search}%'
      ) `
    }
  
    let sql = `
      SELECT 
        user_id,
        user_email,
        user_phone_number,
        user_full_name,
        user_role,
        user_join_date,
        user_status,
        address_id,
        address_title,
        address_full,
        address_province_id,
        address_province_name,
        address_district_id,
        address_district_name
      FROM users
      LEFT JOIN user_addresses ON address_user_id = user_id
      ${queryFilter} ${whereSearch}
      ORDER BY user_id ASC
    `
  
    let result: any = await Database.rawQuery(sql)
    let resultData: any = result.rowCount > 0 ? Helper.sanitizationResponse(result.rows) : []
    let newObj: any = []
  
    if (result.rowCount > 0) {
      try {
        if (resultData.length > 0) {
          for (let i in resultData) {
            resultData[i].total_spend = Number(resultData[i].total_spend) 
            newObj.push(resultData[i])
          }
        }
  
        let workbook = new Excel.Workbook()
        let worksheet = workbook.addWorksheet("Sheet1")
        let font = { name: 'Arial', size: 10 }
  
        worksheet.mergeCells('A1', 'O1')
        worksheet.mergeCells('A2', 'O2')
        worksheet.mergeCells('A3', 'O3')
        worksheet.mergeCells('A4', 'O4')
        worksheet.mergeCells('A5', 'O5')
  
        worksheet.getCell('A1').value = 'Mataram Textile'
        worksheet.getCell('A2').value = 'Data Pelanggan '
        worksheet.getCell('A3').value = '-'
        worksheet.getCell('A4').value = '-'
  
        worksheet.getCell('A1').alignment = {
          vertical : "middle", horizontal : "center"
        }
        worksheet.getCell('A2').alignment = {
          vertical : "middle", horizontal : "center"
        }
        worksheet.getCell('A3').alignment = {
          vertical : "middle", horizontal : "center"
        }
        worksheet.getCell('A4').alignment = {
          vertical : "middle", horizontal : "center"
        }
        worksheet.getCell('A5').alignment = {
          vertical : "middle", horizontal : "center"
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
          "Nama Customer", 
          "No. Telepon", 
          "Email",
          "Alamat", 
          "Kota", 
          "Provinsi", 
          "Status"
        ];
  
        worksheet.columns = [
          { header: "No", key: "no", width: 5, style: { font } },
          { header: "Nama Customer", key: "user_full_name", width: 30, style: { font } },
          { header: "No. Telepon", key: "user_phone_number", width: 20, style: { font } },
          { header: "Email", key: "user_email", width: 30, style: { font } },
          { header: "Alamat", key: "address_title", width: 20, style: { font } },
          { header: "Kota", key: "address_district_name", width: 20, style: { font } },
          { header: "Provinsi", key: "address_province_name", width: 20, style: { font } },
          { header: "Status", key: "user_status", width: 25, style: { font } },
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
        newObj.map(async (item: any) => {
          worksheet.addRow({
            no: no,
            user_full_name: item.user_full_name,
            user_phone_number: item.user_phone_number,
            user_email: item.user_email,
            address_title: item.address_title,
            address_district_name: item.address_district_name,
            address_province_name: item.address_province_name,
            user_status: item.user_status,
          })
          no++
        })
  
        let datetime = DateTime.local().toFormat('yyyy-MM-dd_HHmmss')
        let path: string = `Data_user_${user_role}_${datetime}.xlsx`
  
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
    } else {
      output.message = "Data tidak ditemukan"
      output.status = 'error'
      output.code = 500
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

    let queryFilter = `WHERE 1 = 1 AND user_status = 'active' AND user_branch_id = ${auth.user?.user_branch_id}`
    // if(arrayId == 'all'){
    //   if(auth.user?.user_role !== 'super_admin' && auth.user?.user_role !== 'admin_pps' && auth.user?.user_role !== 'bod'){
    //     queryFilter += ` AND user_customer_type <> 'pps'`
    //   }
    // }else{
    //   if(auth.user?.user_role !== 'super_admin' && auth.user?.user_role !== 'admin_pps' && auth.user?.user_role !== 'bod'){
    //     queryFilter += ` AND user_customer_type <> 'pps' AND user_id IN (${arrayId})`
    //   }else{
    //     queryFilter += ` AND user_id IN (${arrayId})`
    //   }
    // }

    let sql = `
      SELECT 
        user_id,
        user_full_name,
        user_role,
        user_email,
        user_phone_number,
        user_status,
        address_full,
        address_province_name,
        address_district_name,
        address_sub_district_name,
        address_postal_code
      FROM users
      LEFT JOIN user_addresses ON address_user_id = user_id
      ${queryFilter}
      AND user_role = 'customer'
      ORDER BY user_id ASC
    `

		let result: any = await Database.rawQuery(sql)
		let resultData: any = result.rowCount > 0 ? result.rows : []
    let newArr: any = []

		if (result.rowCount > 0) {
      for (let i in resultData) {
        const today = new Date()
        resultData[i].address_province_name = resultData[i].address_province_name ? resultData[i].address_province_name : ''
        resultData[i].address_district_name = resultData[i].address_district_name ? resultData[i].address_district_name : ''
        resultData[i].address_sub_district_name = resultData[i].address_sub_district_name ? resultData[i].address_sub_district_name : ''
        resultData[i].address_postal_code = resultData[i].address_postal_code ? resultData[i].address_postal_code : ''
        resultData[i].country = 'Indonesia'
        resultData[i].idr = 'IDR'
        resultData[i].code_doc = 'INVOICE'
        resultData[i].saldo_first_date = await Helper.formatDateNew(today)
        newArr.push(resultData[i])
      }

			try {
				let workbook = new Excel.Workbook()
				let worksheet = workbook.addWorksheet("Sheet 1")
				let font = { name: 'Arial', size: 13 }

				worksheet.columns = [
					{ header: "Category", key: "user_customer_type", width: 15, style: { font } },
					{ header: "Customer No", key: "user_id", width: 15, style: { font } },
					{ header: "Name", key: "user_full_name", width: 25, style: { font } },
					{ header: "Contact", key: "", width: 15, style: { font } },
					{ header: "Business Phone", key: "", width: 15, style: { font } },
					{ header: "Mobile Phone", key: "user_phone_number", width: 20, style: { font } },
					{ header: "Fax number", key: "", width: 15, style: { font } },
					{ header: "Email", key: "user_email", width: 25, style: { font } },
					{ header: "Website", key: "", width: 15, style: { font } },
					{ header: "Currency", key: "idr", width: 15, style: { font } },
					{ header: "As of Opening Balance", key: "", width: 15, style: { font } },
					{ header: "Opening Balance", key: "", width: 15, style: { font } },
					{ header: "Opening Balance Curency", key: "", width: 15, style: { font } },
					{ header: "Opening Balance Rate", key: "", width: 15, style: { font } },
					{ header: "Opening Balance Invoice Number", key: "", width: 15, style: { font } },
					{ header: "Opening Balance Branch", key: "", width: 15, style: { font } },
					{ header: "Opening Balance Term", key: "", width: 15, style: { font } },
					{ header: "Opening Balance Salesman", key: "", width: 15, style: { font } },
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
					{ header: "Numeric 1", key: "", width: 15, style: { font } },
					{ header: "Numeric 2", key: "", width: 15, style: { font } },
					{ header: "Numeric 3", key: "", width: 15, style: { font } },
					{ header: "Numeric 4", key: "", width: 15, style: { font } },
					{ header: "Numeric 5", key: "", width: 15, style: { font } },
					{ header: "Numeric 6", key: "", width: 15, style: { font } },
					{ header: "Numeric 7", key: "", width: 15, style: { font } },
					{ header: "Numeric 8", key: "", width: 15, style: { font } },
					{ header: "Numeric 9", key: "", width: 15, style: { font } },
					{ header: "Numeric 10", key: "", width: 15, style: { font } },
					{ header: "Date 1", key: "", width: 15, style: { font } },
					{ header: "Date 2", key: "", width: 15, style: { font } },
					{ header: "Billing Address", key: "address_full", width: 30, style: { font } },
					{ header: "City", key: "address_district_name", width: 25, style: { font } },
					{ header: "Province", key: "address_province_name", width: 25, style: { font } },
					{ header: "Country", key: "country", width: 20, style: { font } },
					{ header: "Zip Code", key: "address_postal_code", width: 15, style: { font } },
					{ header: "Address (Shipping)", key: "address_delivery", width: 30, style: { font } },
					{ header: "City (Shipping)", key: "address_district_name_delivery", width: 25, style: { font } },
					{ header: "Province (Shipping)", key: "address_province_name_delivery", width: 25, style: { font } },
					{ header: "Country (Shipping)", key: "country_delivery", width: 20, style: { font } },
					{ header: "Zip Code (Shipping)", key: "address_postal_code_delivery", width: 15, style: { font } },
					{ header: "Sales Category", key: "", width: 15, style: { font } },
					{ header: "Discount Category", key: "", width: 15, style: { font } },
					{ header: "Terms", key: "", width: 15, style: { font } },
					{ header: "Default Salesman", key: "", width: 15, style: { font } },
					{ header: "Default Salesman 2", key: "", width: 15, style: { font } },
					{ header: "Default Salesman 3", key: "", width: 15, style: { font } },
					{ header: "Default Salesman 4", key: "", width: 15, style: { font } },
					{ header: "Default Salesman 5", key: "", width: 15, style: { font } },
					{ header: "Default Discount (%)", key: "", width: 15, style: { font } },
					{ header: "NPWP", key: "", width: 15, style: { font } },
					{ header: "Tax Payer Name", key: "", width: 15, style: { font } },
					{ header: "NIK", key: "", width: 15, style: { font } },
					{ header: "NPPKP", key: "", width: 15, style: { font } },
					{ header: "Tax Type", key: "", width: 15, style: { font } },
					{ header: "Address (Tax)", key: "address_tax", width: 30, style: { font } },
					{ header: "City (Tax)", key: "address_district_name_tax", width: 25, style: { font } },
					{ header: "Province (Tax)", key: "address_province_name_tax", width: 25, style: { font } },
					{ header: "Country (Tax)", key: "country_tax", width: 20, style: { font } },
					{ header: "Zip Code (Tax)", key: "address_postal_code_tax", width: 15, style: { font } },
					{ header: "Document code", key: "code_doc", width: 15, style: { font } },
					{ header: "Used in branch", key: "", width: 15, style: { font } },
					{ header: "Default Description", key: "", width: 15, style: { font } },
					{ header: "Consignee", key: "", width: 15, style: { font } },
					{ header: "Receivable Account", key: "", width: 15, style: { font } },
					{ header: "Down Payment Account", key: "", width: 15, style: { font } },
					{ header: "Default Total Invoice included Tax", key: "", width: 15, style: { font } },
					{ header: "Limit Age Value (day)", key: "", width: 15, style: { font } },
					{ header: "Customer Limit Amount", key: "", width: 15, style: { font } },
					{ header: "Notes", key: "", width: 15, style: { font } },
					{ header: "VA Number", key: "", width: 15, style: { font } },
					{ header: "Suspended", key: "user_status", width: 15, style: { font } },
				]

        newArr.map(async (item: any) => {
					worksheet.addRow({
						user_customer_type: item.user_customer_type,
						user_id: item.user_id,
						user_full_name: item.user_full_name,
						user_role: item.user_role,
						user_email: item.user_email,
						user_phone_number: item.user_phone_number,
						user_status: item.user_status == "active" ? "Tidak" : "Iya",
						address_full: item.address_full,
						address_province_name: item.address_province_name,
						address_district_name: item.address_district_name,
						address_sub_district_name: item.address_sub_district_name,
						address_postal_code: item.address_postal_code,
						country: item.country,
						address_tax: item.address_full,
						address_province_name_tax: item.address_province_name,
						address_district_name_tax: item.address_district_name,
						address_sub_district_name_tax: item.address_sub_district_name,
						address_postal_code_tax: item.address_postal_code,
						country_tax: item.country,
						address_delivery: item.address_full,
						address_province_name_delivery: item.address_province_name,
						address_district_name_delivery: item.address_district_name,
						address_sub_district_name_delivery: item.address_sub_district_name,
						address_postal_code_delivery: item.address_postal_code,
						country_delivery: item.country,
						idr: item.idr,
						code_doc: item.code_doc,
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
				let path: string = `Customer_Accurate_${datetime}.xlsx`

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
