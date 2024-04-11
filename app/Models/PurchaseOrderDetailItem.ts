import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class PoDetailItem extends BaseModel {
  @column({ isPrimary: true })
  public po_detail_item_id: number

  @column()
  public po_detail_item_po_id: number

  @column()
  public po_detail_item_po_detail_id: number

  @column()
  public po_detail_item_product_value: number
  
  @column()
  public po_detail_item_is_stock: number

  @column()
  public po_detail_item_po_receiving_id: number
}