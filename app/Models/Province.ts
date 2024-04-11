import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class Province extends BaseModel {
  @column({ isPrimary: true })
  public provinces_id: number

  @column()
  public provinces_name: string

  @column()
  public provinces_region_id: number

}
