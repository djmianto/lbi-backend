import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  public user_id: number

  @column()
  public user_name: string

  @column()
  public user_email: string

  @column()
  public user_password: string

  @column()
  public user_phone_number: string

  @column()
  public user_first_name: string

  @column()
  public user_last_name: string

  @column()
  public user_full_name: string

  @column()
  public user_profile_url: string

  @column()
  public user_role: string

  @column()
  public user_join_date: Date

  @column()
  public user_status: string

  @column()
  public user_gender: string

  @column()
  public user_firebase_uid: string

  @column()
  public user_fcm_token: string

  @column()
  public user_otp_code: string

  @column()
  public user_branch_id: number

  @column()
  public user_is_deleted: number
  
  @column.dateTime({ autoCreate: true })
  public user_created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public user_updated_at: DateTime
}
















