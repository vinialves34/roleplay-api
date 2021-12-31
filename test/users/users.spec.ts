import Database from '@ioc:Adonis/Lucid/Database';
import test from 'japa';
import supertest from 'supertest';
import { UserFactory } from '../../database/factories/index';
import Hash from '@ioc:Adonis/Core/Hash';

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`;

let token = '';

test.group('User', (group) => {
    test('it should create an user', async (assert) => {
        const userPayload = {
            email: 'test@test.com',
            username: 'test',
            password: '1234',
            avatar: 'https://images.com/image/1'
        }

        const { body } = await supertest(BASE_URL).post('/users').send(userPayload).expect(201);

        assert.exists(body.user, 'User undefined');
        assert.exists(body.user.id, 'Id undefined');
        assert.equal(body.user.email, userPayload.email);
        assert.equal(body.user.username, userPayload.username);
        assert.notExists(body.user.password, 'Password defined');
    });

    test('it should return 409 when email is already in use', async (assert) => {
        const { email } = await UserFactory.create();
        const { body } = await supertest(BASE_URL).post('/users').send({
            email,
            username: 'test',
            password: 'test',
        }).expect(409);
        
        assert.exists(body.message);
        assert.exists(body.code);
        assert.exists(body.status);
        assert.include(body.message, 'Email');
        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 409);
    });

    test('it should return 409 when username is already in use', async (assert) => {
        const { username } = await UserFactory.create();
        const { body } = await supertest(BASE_URL).post('/users').send({
            username,
            email: 'test@test.com',
            password: 'test',
        }).expect(409);
        
        assert.exists(body.message);
        assert.exists(body.code);
        assert.exists(body.status);
        assert.include(body.message, 'Username');
        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 409);
    });

    test('it should return 422 when required data is not provided', async (assert) => {
        const { body } = await supertest(BASE_URL).post('/users').send({}).expect(422);
        
        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });

    test('it should return 422 when providing an invalid email', async (assert) => {
        const { body } = await supertest(BASE_URL).post('/users').send({
            email: 'test@',
            password: 'teste',
            username: 'teste'
        }).expect(422);

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });

    test('it should return 422 when providing an invalid password', async (assert) => {
        const { body } = await supertest(BASE_URL).post('/users').send({
            email: 'test@test.com',
            password: '123',
            username: 'teste'
        }).expect(422);

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });

    test('it should update an user', async (assert) => {
        const { id, password } = await UserFactory.create();
        const email = 'test@test.com';
        const avatar = 'https://avatars.githubusercontent.com/u/48140587?v=4';

        const { body } = await supertest(BASE_URL).put(`/users/${id}`).send({
            email,
            avatar,
            password
        })
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

        assert.exists(body.user, 'User undefined');
        assert.equal(body.user.email, email);
        assert.equal(body.user.avatar, avatar);
        assert.equal(body.user.id, id);
    });

    test('it should update the password of the user', async (assert) => {
        const user = await UserFactory.create();
        const password = 'test';

        const { body } = await supertest(BASE_URL).put(`/users/${user.id}`).send({
            email: user.email,
            avatar: user.avatar,
            password
        })
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

        assert.exists(body.user, 'User undefined');
        assert.equal(body.user.id, user.id);

        await user.refresh();
        assert.isTrue(await Hash.verify(user.password, password));
    });

    test('it should return 422 when required data is not provided', async (assert) => {
        const { id } = await UserFactory.create();
        const { body } = await supertest(BASE_URL).put(`/users/${id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({}).expect(422);

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });

    test('it should return 422 when providing an invalid email', async (assert) => {
        const { id, password, avatar } = await UserFactory.create();
        const { body } = await supertest(BASE_URL).put(`/users/${id}`).send({
            email: 'test',
            avatar: avatar,
            password: password
        })
        .set("Authorization", `Bearer ${token}`)
        .expect(422);

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });

    test('it should return 422 when providing an invalid password', async (assert) => {
        const { id, email, avatar } = await UserFactory.create();
        const { body } = await supertest(BASE_URL).put(`/users/${id}`).send({
            email: email,
            avatar: avatar,
            password: '123'
        })
        .set("Authorization", `Bearer ${token}`)
        .expect(422);

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });

    test('it should return 422 when providing an invalid avatar', async (assert) => {
        const { id, email, password } = await UserFactory.create();
        const { body } = await supertest(BASE_URL).put(`/users/${id}`).send({
            email: email,
            avatar: 'avatar',
            password: password
        })
        .set("Authorization", `Bearer ${token}`)
        .expect(422);

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });

    group.before(async () => {
        const plainPassword = "test"
        const { email } = await UserFactory.merge({ password: plainPassword }).create()
        const { body } = await supertest(BASE_URL)
            .post("/sessions").send({ email, password: plainPassword })
            .expect(201)
        
        token = body.token.token
    })

    group.beforeEach(async () => {
        await Database.beginGlobalTransaction()
    });

    group.afterEach(async () => {
        await Database.rollbackGlobalTransaction()
    });
});