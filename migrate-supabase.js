const { migrateLocalDb } = require("./supabase-db");

migrateLocalDb()
  .then(({ migrated }) => {
    console.log(`Migración completada: ${migrated} reserva(s).`);
  })
  .catch((error) => {
    console.error("No se pudo completar la migración:", error.message);
    process.exitCode = 1;
  });
