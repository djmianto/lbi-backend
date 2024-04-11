import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class AdminMenu extends BaseModel {
  @column({ isPrimary: true })
  public menu_id: number

  @column()
  public menu_parent_id: number

  @column()
  public menu_key: string

  @column()
  public menu_title: string

  @column()
  public menu_icon: string

  @column()
  public menu_role: string

  @column()
  public menu_status: string

  @column()
  public menu_branch_id: number

  @column.dateTime({ autoCreate: true })
  public menu_created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public menu_updated_at: DateTime
}
