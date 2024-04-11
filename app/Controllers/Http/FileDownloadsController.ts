import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

import Application from '@ioc:Adonis/Core/Application'

export default class FileDownloadsController {

  public async index({ request, response }: HttpContextContract) {

    let filename: number = request.params().filename

    const filePath = `uploads/${filename}`

    response.download(Application.tmpPath(filePath), true, (error) => {
      if (error.code === 'ENOENT') {
        return ['File tidak ditemukan', 404]
      }

      return ['Tidak dapat mengunduh file', 400]
    })
  }

}
