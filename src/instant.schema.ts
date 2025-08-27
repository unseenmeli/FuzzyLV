import { i } from "@instantdb/react-native";

const _schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed(),
      name: i.string().optional(),
    }),
  },
});

type AppSchema = typeof _schema;
interface Schema extends AppSchema {}
const schema: Schema = _schema;

export type { AppSchema };
export default schema;