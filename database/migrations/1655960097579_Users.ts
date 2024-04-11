import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class UsersSchema extends BaseSchema {
  protected tableName = 'users'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('user_id').primary()
      table.string('user_name', 100).index()
      table.string('user_email', 100).unique().index()
      table.text('user_password')
      table.string('user_phone_number', 20).unique()
      table.string('user_first_name', 50).index()
      table.string('user_last_name', 50).index()
      table.string('user_full_name', 150).index()
      table.string('user_profile_url', 250)
      table.string('user_role', 20).defaultTo('customer').index()
      table.date('user_join_date').defaultTo(null)
      table.string('user_firebase_uid', 50).unique()
      table.string('user_gender', 20).defaultTo('female')
      table.string('user_status', 20).defaultTo('active').index()
      table.timestamp('user_created_at', { useTz: true })
      table.timestamp('user_updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
