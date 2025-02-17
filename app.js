import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './Components/Database/Database.js';

// Import de Componentes
import logger from './Components/Logger/Logger.js';
import classGenerator from './Components/ClassGenerator/ClassGenerator.js';
dotenv.config({ path: './.env' });

const app = express();
app.set('port', 3003);
app.use(cors());
app.use(express.json());

const catalog = await classGenerator.getCatalog();

const responseStatus = {
  success: 'SUCCESS',
  error: 'ERROR',
};

app.listen(app.get('port'), () => {
  console.log(`Server running on port ${app.get('port')}`);
});

app.get('/catalog', async (req, res) => {
  try {
    console.log('llegó el request');
    res.json({
      status: responseStatus.success,
      catalog,
      message: 'Catalogo obtenido correctamente',
    });
    logger.log('log', 'app', 'getCatalog', 'Catalogo despachado correctamente');
  } catch (error) {
    res.json({
      status: responseStatus.error,
      message: 'Error al obtener el catalogo',
    });
    logger.log('error', 'app', 'getCatalog', error);
  }
});

app.post('/generateClasses', async (req, res) => {
  try {
    await classGenerator.run();
    res.json({
      status: responseStatus.success,
      message: 'Clases generadas correctamente',
    });
    logger.log(
      'log',
      'app',
      'generateClasses',
      'Clases generadas correctamente',
    );
  } catch (error) {
    res.json({
      status: responseStatus.error,
      message: 'Clases Incorrectamente',
    });
    logger.log('error', 'app', 'generateClasses', error);
  }
});

// todo: mover que los "conditional" sean una propiedad del objeto principal y no de values, que sea un array para poder tener varias condiciones :)
app.post('/createQuery', async (req, res) => {
  try {
    const props = req.body;

    const queryGenerator = {
      insert: (tableName, values) => {
        return `INSERT INTO ${tableName} (${Object.keys(values).join(
          ',',
        )}) VALUES (${Object.values(values).join(',')})`;
      },

      update: (tableName, values, conditional) => {
        const updateValues = Object.entries(values)
          .map(([key, value]) => `${key} = ${value}`)
          .join(', ');

        const condition = `${conditional.tableField} = ${conditional.value}`;

        return `UPDATE ${tableName} SET ${updateValues} WHERE ${condition}`;
      },

      delete: (tableName, values, conditional) => {
        if (!conditional || !conditional.tableField || !conditional.value) {
          throw new Error('Condiciones no válidas para la eliminación');
        }

        const condition = `${conditional.tableField} = ${conditional.value}`;

        return `DELETE FROM ${tableName} WHERE ${condition}`;
      },

      select: (query) => {},
    };

    const result = queryGenerator[props.methodName](
      props.tableName,
      props.values,
      props.conditional,
    );

    // const result = await db.executeQuery(query, values);
    res.json({
      status: responseStatus.success,
      result,
      message: 'Query ejecutada correctamente',
    });
    logger.log('log', 'app', 'runQuery', 'Query ejecutada correctamente');
  } catch (error) {
    logger.log('error', 'app', 'runQuery', error);
  }
});

app.post('/runCustomQuery', async (req, res) => {
  const { customQuery } = req.body;
  const result = await db.customQuery(customQuery);

  if (result.status === 'ERROR') {
    logger.log('error', 'app', 'runCustomQuery', result.res);
    return res.status(500).json({
      status: responseStatus.error,
      message: 'Error al ejecutar la query',
      rows: [],
      columns: [],
      error: result.res,
    });
  }

  logger.log('log', 'app', 'runCustomQuery', 'Query ejecutada correctamente');
  const columns = result.res.fields.map((field) => field.name);
  res.json({
    status: responseStatus.success,
    rows: result.res.rows,
    columns,
    message: 'Query ejecutada correctamente',
  });
});
