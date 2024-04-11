import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class District extends BaseModel {
  @column({ isPrimary: true })
  public districts_id: number

  @column()
  public districts_province_id: number

  @column()
  public districts_name: string
}
