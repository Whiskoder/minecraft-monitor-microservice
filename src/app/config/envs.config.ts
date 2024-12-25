import 'dotenv/config';
import * as joi from 'joi';
import { join } from 'path';

interface EnvsVariables {
  PORT: number;
  API_HOST: string;
  BASE_DIR: string;
  HOME?: string;
  USERPROFILE?: string;
}

const envsSchema = joi
  .object<EnvsVariables>({
    PORT: joi.number().required(),
    API_HOST: joi.string().required(),
    BASE_DIR: joi.string().required(),
    HOME: joi.string().optional(),
    USERPROFILE: joi.string().optional(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate(process.env);

if (error) throw new Error(`Config validation error: ${error.message}`);

const envsVariables: EnvsVariables = value;

const homeDir = envsVariables.HOME || envsVariables.USERPROFILE;

export const envs = {
  port: envsVariables.PORT,
  apiHost: envsVariables.API_HOST,
  baseDir: join(homeDir, envsVariables.BASE_DIR),
};
