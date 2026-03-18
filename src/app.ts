import type { Request, Response } from 'express'
import config from './config/config.js'
import express from 'express'
import { errorHandler } from '#middlewares/errorHandler.js'

const app = express()
const port = 3000

app.get('/', (req: Request, res: Response) => {
  res.send('PLOTS!')
})

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
});
