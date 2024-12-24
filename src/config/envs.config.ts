import 'dotenv/config';
import * as joi from 'joi';

interface EnvsVariables {
  PORT: number;
}

const envsSchema = joi
  .object<EnvsVariables>({
    PORT: joi.number().required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate(process.env);

if (error) throw new Error(`Config validation error: ${error.message}`);

const envsVariables: EnvsVariables = value;

export const envs = {
  port: envsVariables.PORT,
};
