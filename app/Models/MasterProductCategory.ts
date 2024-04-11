import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class MasterProductCategory extends BaseModel {
  @column({ isPrimary: true })
  public product_category_id: number

  @column()
  public product_category_category_id: number

  @column()
  public product_category_product_id: number

  @column.dateTime({ autoCreate: true })
  public product_category_created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public product_category_updated_at: DateTime
}
