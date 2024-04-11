import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class ProductCategory extends BaseModel {
  @column({ isPrimary: true })
  public category_id: number

  @column()
  public category_parent_id: number

  @column()
  public category_name: string

  @column()
  public category_desc: string

  @column()
  public category_image: string

  @column()
  public category_banner_image: string

  @column()
  public category_status: string

  @column.dateTime({ autoCreate: true })
  public category_created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public category_updated_at: DateTime
}
