import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class SubDistrict extends BaseModel {
  @column({ isPrimary: true })
  public subdistrict_id: number

  @column()
  public subdistrict_district_id: string

  @column()
  public subdistrict_name: string
}
