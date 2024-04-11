'use strict'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import Hash from '@ioc:Adonis/Core/Hash'
import Database from '@ioc:Adonis/Lucid/Database'
import Helper from 'App/Common/Helper'

export default class AuthController {
  public async loginAdmin({ auth, request, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      result: {}
    }
    let from: any
    let queryWhere: any
    let row: any

    try {
      const userRole = await User
        .query()
        .select('user_role')
        .where('user_email', request.input('user_email'))
        .first()

      if(userRole){

        from = `FROM users`
        row = `
          user_id,
          user_name,
          user_email,
          user_password,
          user_phone_number,
          user_first_name,
          user_last_name,
          user_full_name,
          user_profile_url,
          user_join_date,
          user_status,
          user_role,
          user_branch_id
        `
        queryWhere = `WHERE user_email = '${request.input("user_email")}' AND user_status = 'active'`
        if (userRole.$attributes.user_role !== 'hr_manager'
          && userRole.$attributes.user_role !== 'hr_officer'
          && userRole.$attributes.user_role !== 'cfo'
          && userRole.$attributes.user_role !== 'staf_operations'
          && userRole.$attributes.user_role !== 'head_of_operations'
          && userRole.$attributes.user_role !== 'coo'
          && userRole.$attributes.user_role !== 'senior_acountant'
          && userRole.$attributes.user_role !== 'junior_acountant'
          && userRole.$attributes.user_role !== 'purchasing') {
          from += `
            LEFT JOIN branches ON branch_id = user_branch_id
          `
          row += `,branch_id,
            branch_name
          `
        }else{
          throw new Error("Email tidak terdaftar!")
        }
  
        let sql = `
          SELECT 
          ${row}
          ${from}
          ${queryWhere}
          LIMIT 1
        `
        let queryUser: any = await Database.rawQuery(sql)
        
        let user: any = queryUser.rowCount > 0 ? queryUser.rows[0] : {}
  
        if (queryUser.rowCount === 0) {
          return response.status(200).json({
            code: 401,
            status: 'Unauthorized',
            message: "Anda tidak memiliki permission!"
          })
        }
  
        user = Helper.sanitizationResponse(user)
  
        if (await Hash.verify(user.user_password, request.input("user_password"))) {
          const token = await auth.use('api').generate(user, {
            expiresIn: '1days'
          })
          if (userRole.$attributes.user_role !== 'admin_warehouse'
            && userRole.$attributes.user_role !== 'hr_officer'
            && userRole.$attributes.user_role !== 'cfo'
            && userRole.$attributes.user_role !== 'staf_operations'
            && userRole.$attributes.user_role !== 'head_of_operations'
            && userRole.$attributes.user_role !== 'coo'
            && userRole.$attributes.user_role !== 'senior_acountant'
            && userRole.$attributes.user_role !== 'junior_acountant'
            && userRole.$attributes.user_role !== 'finance_lead'
            && userRole.$attributes.user_role !== 'admin_finance'
            && userRole.$attributes.user_role !== 'warehouse_lead'
            && userRole.$attributes.user_role !== 'manager'
            && userRole.$attributes.user_role !== 'purchasing') {
            if (user.user_role !== 'super_admin' && user.user_role !== 'bod' && !user.user_branch_id) {
              return response.status(200).json({
                code: 401,
                status: 'Unauthorized',
                message: "Anda belum memiliki cabang, silahkan hubungi Admin!"
              })
            }
          }
  
          let queryFilter = `WHERE menu_status = 'active' AND menu_branch_id = ${user.user_branch_id}`
          queryFilter += `AND string_to_array(menu_role,',') && array['${user.user_role}']`
  
          sql = `
            SELECT
              menu_id as id,
              menu_parent_id as parent_id,
              menu_key as key,
              menu_title as title,
              menu_icon as icon,
              menu_role as role,
              menu_status as status
              FROM admin_menus
            ${queryFilter}
            ORDER BY menu_id ASC
          `
          
          let result: any = await Database.rawQuery(sql)
          let resultData = result.rowCount > 0 ? result.rows : []
          if (resultData.length > 0) {
            resultData.forEach((item: any, index: number) => {
              resultData[index].role = item.role.split(',')
            })
          }
          if (result.rowCount === 0) {
            return response.status(200).json({
              code: 401,
              status: 'Unauthorized',
              message: "Anda belum memiliki permission!"
            })
          } else {
            const sanitization = Helper.sanitizationResponse(resultData)
            user.user_branch_id = user.user_branch_id ? user.user_branch_id : 0
            delete user.user_password
  
            output = {
              code: 200,
              status: 'success',
              message: 'Berhasil Login',
              result: {
                user: user,
                data_token: token,
                menu: Helper.arrayToTree(sanitization, 0, 'id', 'parent_id', 'sub_menu')
              }
            }
          }
  
        }else{
          throw new Error("Email atau Password salah")
        }
      }else{
        throw new Error("Email atau Password salah")
      }
    } catch (err) {
      output.message = err.message
      output.code = 500
    }

    return response.status(200).json(output)
  }

  public async logout({ auth, response }: HttpContextContract) {
    let output: any = {
      code: 400,
      status: 'error',
      message: 'Bad Request',
      data: {}
    }

    try {

      await auth.use('api').revoke()

      output = {
        code: 200,
        status: 'success',
        message: 'Berhasil logout',
        result: {}
      }

    } catch (err) {
      output.message = err.message
      output.code = 500
    }
    return response.status(200).json(output)
  }

}