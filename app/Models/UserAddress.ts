import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class UserAddress extends BaseModel {
  @column({ isPrimary: true })
  public address_id: number

  @column()
  public address_user_id: number

  @column()
  public address_title: string

  @column()
  public address_full: string

  @column()
  public address_province_id: number

  @column()
  public address_province_name: string

  @column()
  public address_district_id: number

  @column()
  public address_district_name: string

  @column()
  public address_sub_district_id: number

  @column()
  public address_sub_district_name: string

  @column()
  public address_postal_code: string

  @column()
  public address_longitude: string

  @column()
  public address_latitude: string

  @column()
  public address_phone_number: string

  @column.dateTime({ autoCreate: true })
  public address_created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public address_updated_at: DateTime
}
