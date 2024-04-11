import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class MasterProduct extends BaseModel {
  @column({ isPrimary: true })
  public product_id: number

  @column()
  public product_sku: string

  @column()
  public product_first_name: string

  @column()
  public product_last_name: string

  @column()
  public product_full_name: string

  @column()
  public product_desc: string

  @column()
  public product_photo: string

  @column()
  public product_default_value: number

  @column()
  public product_unit: string

  @column()
  public product_selling_unit: number

  @column()
  public product_weight: number

  @column()
  public product_width: number

  @column()
  public product_length: string

  @column()
  public product_status: string 

  @column()
  public product_branch_id: number 
  
  @column.dateTime({ autoCreate: true })
  public product_created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public product_updated_at: DateTime

  @column()
  public product_is_deleted: number

}