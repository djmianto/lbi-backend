import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class Branch extends BaseModel {
  @column({ isPrimary: true })
  public branch_id: number

  @column()
  public branch_name: string

  @column()
  public branch_code: string

  @column()
  public branch_address: string

  @column()
  public branch_province_id: number

  @column()
  public branch_province_name: string

  @column()
  public branch_district_id: number

  @column()
  public branch_district_name: string

  @column()
  public branch_sub_district_id: number

  @column()
  public branch_sub_district_name: string

  @column()
  public branch_postal_code: number

  @column()
  public branch_longitude: string

  @column()
  public branch_latitude: string

  @column()
  public branch_phone_number: string

  @column()
  public branch_mobile_number: string

  @column()
  public branch_status: string

  @column.dateTime({ autoCreate: true })
  public branch_created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public branch_updated_at: DateTime

}