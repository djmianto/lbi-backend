import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class PoPayment extends BaseModel {
  @column({ isPrimary: true })
  public po_payment_id: number

  @column()
  public po_payment_po_id: number

  @column()
  public po_payment_method: string

  @column()
  public po_payment_status: string

  @column()
  public po_payment_amount: number

  @column()
  public po_payment_installment: number

  @column()
  public po_payment_remaining: number

  @column.dateTime({ autoCreate: true })
  public po_payment_created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public po_payment_updated_at: DateTime
}
