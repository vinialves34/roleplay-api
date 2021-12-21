import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Mail from '@ioc:Adonis/Addons/Mail'
import User from 'App/Models/User'
import { randomBytes } from 'crypto'
import { promisify } from 'util'
import ForgotPassword from '../../Validators/ForgotPasswordValidator';
import ResetPassword from '../../Validators/ResetPasswordValidator';

export default class PasswordsController {
    public async forgotPassword({ request, response }: HttpContextContract) {
        const { email, resetPasswordUrl } = await request.validate(ForgotPassword)
        const user = await User.findByOrFail('email', email)

        const random = await promisify(randomBytes)(24)
        const token = random.toString('hex')

        await user.related('tokens').updateOrCreate({ userId: user.id }, { token })

        const resetPasswordUrlWithToken = `${resetPasswordUrl}?token=${token}`
        await Mail.send((message) => {
            message.from('no-reply@roleplay.com')
                .to(email)
                .subject('Roleplay: Recuperação de Senha')
                .htmlView('email/forgotpassword', {
                    productName: 'Roleplay',
                    name: user.username,
                    resetPasswordUrl: resetPasswordUrlWithToken
                })
        })

        return response.noContent()
    }

    public async resetPassword({ request, response }: HttpContextContract) {
        const { token, password } = await request.validate(ResetPassword)

        const userByToken = await User.query().whereHas('tokens', (query) => {
            query.where('token', token)
        }).firstOrFail()

        userByToken.password = password
        await userByToken.save()

        return response.noContent()
    }
}
