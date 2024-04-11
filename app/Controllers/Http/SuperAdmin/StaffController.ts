import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import Database from '@ioc:Adonis/Lucid/Database'
import UserBranch from 'App/Models/UserBranch'
import Hash from '@ioc:Adonis/Core/Hash'
import User from 'App/Models/User'
import Helper from 'App/Common/Helper'
import { DateTime } from 'luxon'
import Excel from 'exceljs'
import Env from '@ioc:Adonis/Core/Env'
import Application from '@ioc:Adonis/Core/Application'

export default class StaffController {
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
          user_email: schema.string({ escape: true, trim: true }, [
            rules.unique({ table: 'users', column: 'user_email' })
          ]),
          user_password: schema.string({}),
          user_full_name: schema.string({ escape: true, trim: true }),
          user_role: schema.enum([
            'admin_warehouse',
            'warehouse_lead',
            'finance_lead',
            'admin_finance',
          ] as const),  
          user_status: schema.enum([
            'active',
            'inactive'
          ] as const),
          user_phone_number: schema.string({ escape: true, trim: true }, [
            rules.unique({ table: 'users', column: 'user_phone_number' })
          ]),
          user_join_date: schema.string.optional({ trim: true }),
        }),
        reporter: CustomReporter
      })
    } catch (error) {
      return response.status(200).json(error.messages)
    }

    try {
      let dataUser: any = {
        user_email: payload.user_email,
        user_password: await Hash.make(payload.user_password),
        user_full_name: payload.user_full_name,
        user_role: payload.user_role,
        user_phone_number: payload.user_phone_number,
        user_status: payload.user_status,
        user_branch_id: auth.user?.user_branch_id,
        user_join_date: payload.user_join_date ? payload.user_join_date : DateTime.local().toFormat('yyyy-MM-dd')
      }
      let create: any = await User.create(dataUser)

      // const userId = create.$attributes.user_id
      // let dataUserAddress: any = {
      //   address_user_id: userId,
      //   address_full: payload.address_full,
      //   address_province_id: payload.address_province_id,
      //   address_province_name: payload.address_province_name,
      //   address_district_id: payload.address_district_id,
      //   address_district_name: payload.address_district_name,
      //   address_sub_district_id: payload.address_sub_district_id,
      //   address_sub_district_name: payload.address_sub_district_name
      // }
      // let userAddress: any = await UserAddress.create(dataUserAddress)

      // if (userAddress) {
      //   create.$attributes.user_address = userAddress.$attributes
      // }

      delete create.$attributes.user_password
      output = {
        code: 201,
        status: 'success',
        message: 'Berhasil tambah data',
        result: {
          data: Helper.sanitizationResponse(create.$attributes)
        }
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  // not used
  public async addUserToBranch({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let payload: any = await request.validate({
      schema: schema.create({
        user_branch_branch_id: schema.number(),
        user_branch_user_id: schema.number()
      }),
      reporter: CustomReporter
    })

    try {
      if (auth.user?.user_role == 'branch_admin') {
        throw new Error("Maaf anda tidak dapat hak akses ini")
      }
      const checkBranchSpv = await Database
        .query()
        .select()
        .from('user_branches')
        .join('users', 'user_branches.user_branch_user_id', 'users.user_id')
        .where('user_branch_user_id', payload.user_branch_user_id)
        .where('user_branch_branch_id', payload.user_branch_branch_id)
        .where('user_role', 'branch_supervisor')
        .first()
      if (checkBranchSpv) {
        output.code = 409
        output.status = 'duplicate'
        output.message = 'Maaf, anda sudah memiliki supervisor'
      } else {
        const checkUserInBranch = await Database
          .query()
          .from('user_branches')
          .where('user_branch_user_id', payload.user_branch_user_id)
          .first()
        if (checkUserInBranch) {
          output.code = 409
          output.status = 'duplicate'
          output.message = 'Maaf staff sudah terdaftar sebelumnya !!'
        }
        const getUserBranch = await Database
          .query()
          .from('user_branches')
          .where('user_branch_branch_id', payload.user_branch_branch_id)
          .where('user_branch_user_id', payload.user_branch_user_id)
          .first()
        if (getUserBranch) {
          output.code = 409
          output.status = 'Duplicate'
          output.message = 'Staff telah ditambahkan sebelumnya'
        } else {
          console.log(payload)
          let createUserBranch: any = await UserBranch.create(payload)

          output = {
            code: 201,
            status: 'success',
            message: 'Berhasil tambah data',
            result: createUserBranch
          }
        }
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
        user_id: schema.number()
      }),
      reporter: CustomReporter
    })

    try {
      const getUser = await Database
        .query()
        .from('users')
        .where('user_id', payload.user_id)
        .first()

      if (getUser == null) {
        output.code = 404
        output.status = 'not found'
        output.message = 'user tidak ada'
      } else {
        await User.query().where('user_id', payload.user_id).update({ user_status: 'inactive' })
        await UserBranch.query().where('user_branch_user_id', payload.user_id).delete()

        output = {
          code: 201,
          status: 'success',
          message: 'Berhasil hapus data'
        }
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
      let sort = params.sort ? params.sort : 'user_id'
      let dir = params.dir ? params.dir.toUpperCase() : 'DESC'
      let limit = params.limit ? parseInt(params.limit) : 10
      let page = params.page ? parseInt(params.page) : 1
      let start = (page - 1) * limit
      let search = params.search ? params.search : ''
      let from = `FROM users
			`
      let queryLimit = limit < 0 ? '' : `LIMIT ${limit} OFFSET ${start}`
      let queryFilter = `WHERE 1 = 1 
        AND user_is_deleted = 0
        AND user_branch_id = ${auth.user?.user_branch_id}
        `

      if (params.user_role && params.user_role.length > 0) {
        queryFilter += `AND user_role = '${params.user_role}' `
      } else {
        queryFilter += `AND user_role <> 'customer' 
          AND user_role <> 'super_admin'
        `
      }

      let whereSearch = ''
      if (params.user_join_date && params.user_join_date.length > 0 && params.user_join_date !== '') {
        queryFilter += ` AND user_join_date = '${params.user_join_date}'`
      }

      if (params.status && params.status.length > 0 && params.status !== '') {
        queryFilter += ` AND user_status = '${params.status}'`
      }

      // if (params.branch_id && params.branch_id.length > 0 && params.branch_id !== '') {
      //   queryFilter += ` AND branch_id = ${params.branch_id}`
      // }

      if (search.length > 0) {
        whereSearch += `
					AND (
						user_full_name ILIKE '%${search}%' OR
						user_phone_number ILIKE '%${search}%' OR
						user_email ILIKE '%${search}%'
					)
				`
      }

      let sql = `
				SELECT 
          user_id,
          user_email,
          user_phone_number,
          user_role,
          user_full_name,
          user_status,
          user_branch_id,
          user_created_at,
          user_updated_at
			  ${from}
				${queryFilter} ${whereSearch}
				ORDER BY ${sort} ${dir}
				${queryLimit}
			`
      
      let sqlTotal = `
				SELECT 1 as total
        ${from}
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
    let payload: any = await request.validate({
      schema: schema.create({
        user_id: schema.number(),
        user_email: schema.string({}),
        user_password: schema.string.optional(),
        user_phone_number: schema.string({ escape: true, trim: true }),
        user_role: schema.enum([
          'admin_warehouse',
          'warehouse_lead',
          'finance_lead',
          'admin_finance',
        ] as const),
        user_status: schema.enum([
          'active',
          'inactive'
        ] as const),
        user_full_name: schema.string(),
        user_join_date: schema.string.optional({ trim: true }),
      }),
      reporter: CustomReporter,
      messages: {
        enum: "harus salah satu dari: {{ options.choices }}"
      }
    })

    try {
      let dataUser: any = {
        user_id: payload.user_id,
        user_email: payload.user_email,
        user_phone_number: payload.user_phone_number,
        user_status: payload.user_status,
        user_role: payload.user_role,
        user_full_name: payload.user_full_name,
        user_join_date: payload.user_join_date,
      }
      if (payload.user_password) {
        dataUser.user_password = await Hash.make(payload.user_password)
      }

      //update user
      await User
        .query()
        .where('user_id', payload.user_id)
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
          user_branch_id,
          branch_name
				FROM users
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

  public async exportExcel({ auth, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    // let search = params.search ? params.search : ''
    let queryFilter = `WHERE 1 = 1 AND user_is_deleted = 0 
      AND (user_role <> 'customer' OR user_role <> 'super_admin' )
      AND user_branch_id = '${auth.user?.user_branch_id}'
    `

    let sql = `
      SELECT
        user_id,
        user_email,
        user_phone_number,
        user_role,
        user_full_name,
        user_status,
        user_created_at,
        user_updated_at
      FROM users
      ${queryFilter}
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
        worksheet.getCell('A2').value = 'Data Staff'
        worksheet.getCell('A3').value = '-'
        worksheet.getCell('A4').value = '-'

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
          "Nama Staff",
          "No. Telepon",
          "Email",
          "User Role",
          "Status"
        ];

        worksheet.columns = [
          { header: "No", key: "no", width: 5, style: { font } },
          { header: "Nama Staff", key: "user_full_name", width: 30, style: { font } },
          { header: "No. Telepon", key: "user_phone_number", width: 20, style: { font } },
          { header: "Email", key: "user_email", width: 30, style: { font } },
          { header: "User Role", key: "user_role", width: 20, style: { font } },
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
            user_role: item.user_role,
            user_status: item.user_status,
          })
          no++
        })

        let datetime = DateTime.local().toFormat('yyyy-MM-dd_HHmmss')
        let path: string = `Data_staff_${datetime}.xlsx`

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

  public async moveBranch({ request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let payload: any = await request.validate({
      schema: schema.create({
        user_id: schema.number(),
        branch_id: schema.number(),
      }),
      reporter: CustomReporter,
      messages: {
        enum: "harus salah satu dari: {{ options.choices }}"
      }
    })

    try {
      let dataUser: any = {
        user_branch_id: payload.branch_id,
      }

      //update user
      await User
        .query()
        .where('user_id', payload.user_id)
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

}
