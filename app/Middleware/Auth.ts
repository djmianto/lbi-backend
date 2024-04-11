import { GuardsList } from '@ioc:Adonis/Addons/Auth'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { AuthenticationException } from '@adonisjs/auth/build/standalone'

export default class AuthMiddleware {
  protected redirectTo = '/login'
  protected async authenticate(auth: HttpContextContract['auth'], guards: (keyof GuardsList)[]) {
    let guardLastAttempted: string | undefined

    for (let guard of guards) {
      guardLastAttempted = guard
      if (await auth.use(guard).check()) {
        auth.defaultGuard = guard
        return true
      }
    }

    throw new AuthenticationException(
      'Unauthorized access',
      'E_UNAUTHORIZED_ACCESS',
      guardLastAttempted,
      this.redirectTo,
    )
  }

  protected async userRole(auth: HttpContextContract['auth']) {
    if (auth.user?.user_role !== 'customer') {
      throw new AuthenticationException(
        'Unauthorized access',
        'E_UNAUTHORIZED_ACCESS'
      )
    }
  }

  public async handle({ auth, response }: HttpContextContract, next: () => Promise<void>, customGuards: (keyof GuardsList)[]) {
    const guards = customGuards.length ? customGuards : [auth.name]

    try {
      await this.authenticate(auth, guards)
      await this.userRole(auth)
    } catch (error) {
      return response.status(200).json({
        code: 401,
        status: 'Unauthorized',
        message: error.responseText
      })
    }

    await next()
  }
}
