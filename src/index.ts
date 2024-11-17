import { Hono } from 'hono'
import { Bindings } from 'hono/types';
import userRouter from './routes/user';
import weatherRouter from './routes/weather';

interface Env {
  MY_API_KEY: string
  DATABASE_URL: string
}

const app = new Hono<{Bindings: Env}>()

// app.post('/', async (c) => {
//   const body = await c.req.json();
//   console.log(body);
//   console.log(c.req.header('Authorization'));
//   console.log(c.req.query('param1'));
//   return c.text('Hello Hono!')
// })

// app.get('/', (c) => {
//   console.log(c.env.MY_API_KEY)
//   return c.text('Hello Hono! Test application!')
// })

app.get('/', (c) => {
  return c.text('Hello Hono! Weather application!')
})

app.route('/user', userRouter);

app.route('/weather', weatherRouter);

export default app
