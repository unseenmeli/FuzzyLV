import { init } from "@instantdb/react-native";
import schema from "../instant.schema";

const APP_ID = "dbb7e888-c6c4-44f5-992b-9d468e8aa68f";

const db = init({ 
  appId: APP_ID, 
  schema 
});

export default db;