import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class UserBranch extends BaseModel {
  @column({ isPrimary: true })
  public user_branch_id: number

  @column()
  public user_branch_branch_id: number

  @column()
  public user_branch_user_id: number
}
