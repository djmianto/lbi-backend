import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class Supplier extends BaseModel {
  @column({ isPrimary: true })
  public supplier_id: number

  @column()
  public supplier_name: string

  @column()
  public supplier_phone_number: string

  @column()
  public supplier_email: string

  @column()
  public supplier_address: string

  @column()
  public supplier_province_id: number

  @column()
  public supplier_province_name: string

  @column()
  public supplier_district_id: number

  @column()
  public supplier_district_name: string

  @column()
  public supplier_sub_district_id: number

  @column()
  public supplier_sub_district_name: string

  @column()
  public supplier_status: string

  @column()
  public supplier_branch_id: number

  @column()
  public supplier_description: string
  
  @column.dateTime({ autoCreate: true })
  public supplier_created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public supplier_updated_at: DateTime
}
