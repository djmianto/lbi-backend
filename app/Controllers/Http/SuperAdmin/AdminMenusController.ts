import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Helper from 'App/Common/Helper'
import Database from '@ioc:Adonis/Lucid/Database'
import { CustomReporter } from 'App/Validators/Reporters/CustomReporter'
import AdminMenu from 'App/Models/AdminMenu'

export default class AdminMenusController {
  public async create({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    let body: any = request.all()
    let payload: any = {}

    try {

      let schemaList: any = {
        menu_parent_id: schema.number.optional(),
        menu_key: schema.string.optional(),
        menu_title: schema.string.optional(),
        menu_icon: schema.string.optional(),
        menu_role: schema.string.optional(),
        menu_status: schema.string({}),
      }

      if (body.menu_parent_id > 0) {
        schemaList = {
          ...schemaList,
          menu_parent_id: schema.number([rules.exists({ table: 'admin_menus', column: 'menu_id' })])
        }
      }

      payload = await request.validate({
        schema: schema.create(schemaList),
        reporter: CustomReporter,
      })
    } catch (error) {
      return response.status(200).json(error.messages)
    }

    try {
      payload.menu_branch_id = auth.user?.user_branch_id
      let create = await AdminMenu.create(payload)

      output = {
        code: 201,
        status: 'success',
        message: 'Berhasil tambah data',
        result: {
          data: Helper.sanitizationResponse(create)
        }
      }
    } catch (error) {
      output.message = error.message
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

    let body: any = request.all()
    let payload: any = {}

    try {

      let schemaList: any = {
        menu_id: schema.number([rules.exists({ table: 'admin_menus', column: 'menu_id' })]),
        menu_key: schema.string.optional(),
        menu_title: schema.string.optional(),
        menu_icon: schema.string.optional(),
        menu_role: schema.string.optional(),
        menu_status: schema.string({})
      }

      if (body.menu_parent_id > 0) {
        schemaList = {
          ...schemaList,
          menu_parent_id: schema.number([rules.exists({ table: 'admin_menus', column: 'menu_id' })])
        }
      }

      payload = await request.validate({
        schema: schema.create(schemaList),
        reporter: CustomReporter,
      })
    } catch (error) {
      return response.status(200).json(error.messages)
    }

    try {
      await AdminMenu
        .query()
        .where('menu_id', body.menu_id)
        .update(payload)

      output = {
        code: 200,
        status: 'success',
        message: 'Berhasil ubah data',
        result: {
          data: Helper.sanitizationResponse(payload)
        }
      }
    } catch (error) {
      output.message = error.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async remove({ request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }

    let payload: any = await request.validate({
      schema: schema.create({
        menu_id: schema.number([rules.exists({ table: 'admin_menus', column: 'menu_id' })])
      }),
      reporter: CustomReporter
    })

    try {
      await AdminMenu
        .query()
        .where('menu_id', payload.menu_id)
        .delete()

      output = {
        code: 200,
        status: 'success',
        message: 'Berhasil hapus data',
        result: {}
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
      let select: any = `
        menu_id as id,
        menu_parent_id as parent_id,
        menu_key as key,
        menu_title as title,
        menu_icon as icon,
        menu_role as role,
        menu_status as status
      `

      let queryFilter = `WHERE 1 = 1 AND menu_branch_id = ${auth.user?.user_branch_id}`
      let startParent = 0
      if (params.parent_id && params.parent_id.length > 0) {
        startParent = params.parent_id
        queryFilter += ` AND parent_id = '${params.parent_id}'`
      }

      let sql = `
				SELECT ${select}
				FROM admin_menus
				${queryFilter}
				ORDER BY menu_id ASC
			`

      let result: any = await Database.rawQuery(sql)
      let resultData = result.rowCount > 0 ? result.rows : []
      const sanitization = Helper.sanitizationResponse(resultData)

      output = {
        code: 200,
        status: 'success',
        message: 'List data',
        result: {
          data: Helper.arrayToTree(sanitization, Number(startParent), 'id', 'parent_id', 'sub_menu')
        }
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
        menu_id as id,
        menu_parent_id as parent_id,
        menu_key as key,
        menu_title as title,
        menu_icon as icon,
        menu_role as role,
        menu_status as status,
				(
					SELECT array_to_json(array_agg(t)) 
					FROM (
						SELECT 
            menu_id as id,
            menu_parent_id as parent_id,
            menu_key as key,
            menu_title as title,
            menu_icon as icon,
            menu_role as role,
            menu_status as status
						FROM admin_menus
						WHERE menu_parent_id = '${id}'
					) t
				) as sub_menu
				FROM admin_menus
				WHERE menu_id = '${id}'
        AND menu_branch_id = '${auth.user?.user_branch_id}'
			`

      let result: any = await Database.rawQuery(sql)
      let resultData = result.rowCount > 0 ? result.rows[0] : {}

      if (result.rowCount > 0) {
        if (!resultData.sub_menu) {
          resultData.sub_menu = []
        }
      }

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

}
