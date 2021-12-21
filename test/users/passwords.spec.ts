import test from 'japa'
import Database from '@ioc:Adonis/Lucid/Database'
import supertest from 'supertest'
import { UserFactory } from '../../database/factories/index'
import Mail from '@ioc:Adonis/Addons/Mail'
import Hash from '@ioc:Adonis/Core/Hash';

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`

test.group('Password', (group) => {
    test('it should send and email with forgot password instructions', async (assert) => {
        const user = await UserFactory.create()
        
        Mail.trap((message) => {
            assert.deepEqual(message.to, [
                {
                    address: user.email
                },
            ])
            
            assert.deepEqual(message.from, { address: 'no-reply@roleplay.com' })
            assert.equal(message.subject, 'Roleplay: Recuperação de Senha')
            assert.include(message.html!, user.username)
        })

        await supertest(BASE_URL).post('/forgot-password').send({
            email: user.email,
            resetPasswordUrl: 'url',
        }).expect(204)

        Mail.restore()
    })

    test('it should create a reset password token', async (assert) => {
        const user = await UserFactory.create()

        await supertest(BASE_URL).post('/forgot-password').send({
            email: user.email,
            resetPasswordUrl: 'url',
        }).expect(204)

        const tokens = await user.related('tokens').query()
        assert.isNotEmpty(tokens)
    })

    test('it should return 422 when required data is not provided or data is invalid', async (assert) => {
        const { body } = await supertest(BASE_URL).post('/forgot-password').send({}).expect(422)

        assert.equal(body.code, 'BAD_REQUEST')
        assert.equal(body.status, 422)
    })

    test('it should be able to reset password', async (assert) => {
        const user = await UserFactory.create();
        const { token } = await user.related('tokens').create({ token: 'token' })

        await supertest(BASE_URL)
            .post('/reset-password')
            .send({token, password: '123456789'})
            .expect(204)

        await user.refresh()
        const checkPassword = await Hash.verify(user.password, '123456789')

        assert.isTrue(checkPassword)
    })

    test.only('it should return 422 when required data is not provided or data is invalid', async (assert) => {
        const { body } = await supertest(BASE_URL).post('/reset-password').send({}).expect(422)

        assert.equal(body.code, 'BAD_REQUEST')
        assert.equal(body.status, 422)
    })

    group.beforeEach(async () => {
        await Database.beginGlobalTransaction()
    })

    group.afterEach(async () => {
        await Database.rollbackGlobalTransaction()
    })
})