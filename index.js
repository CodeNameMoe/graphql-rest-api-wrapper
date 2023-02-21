import express from "express";
import cors from "cors";
import { graphqlHTTP } from "express-graphql";
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLFloat,
  GraphQLList,
} from "graphql";
import fetch from "node-fetch";

const PORT = 4000;
const API_BASE_URL = "https://api.tvmaze.com";

const castMemberType = new GraphQLObjectType({
  name: "CastMember",
  fields: {
    name: { type: GraphQLString },
    characterName: { type: GraphQLString },
    characterImage: { type: GraphQLString },
  },
});

const showType = new GraphQLObjectType({
  name: "Show",
  fields: {
    id: { type: GraphQLInt },
    name: { type: GraphQLString },
    rating: { type: GraphQLFloat },
    image: { type: GraphQLString },
    summary: { type: GraphQLString },
    network: { type: GraphQLString },
    airDay: { type: GraphQLString },
    status: { type: GraphQLString },
    genres: { type: GraphQLList(GraphQLString) },
    cast: { type: GraphQLList(castMemberType) },
  },
});

const queryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    schedule: {
      type: GraphQLList(showType),
      resolve: async () => {
        const response = await fetch(
          `${API_BASE_URL}/schedule/web?date=2023-01-01`
        );
        const scheduleData = await response.json();
        return scheduleData.map(transformShowData);
      },
    },
    show: {
      type: showType,
      args: {
        id: { type: GraphQLInt },
      },
      resolve: async (_, { id }) => {
        const [showResponse, castResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/shows/${id}`),
          fetch(`${API_BASE_URL}/shows/${id}/cast`),
        ]);
        const showData = await showResponse.json();
        const castData = await castResponse.json();
        return transformShowData(showData, castData);
      },
    },
  },
});

const schema = new GraphQLSchema({
  query: queryType,
});

function transformShowData(showData, castData) {
  const cast = Array.isArray(castData)
    ? castData.map(({ person, character }) => ({
        name: person.name,
        characterName: character.name,
        characterImage: person.image.medium,
      }))
    : [];
  return {
    id: showData.id,
    name: showData.name,
    rating: showData.rating?.average,
    image: showData.image?.medium,
    summary: showData.summary,
    network: showData.network?.name,
    airDay: showData.schedule?.days?.[0],
    status: showData.status,
    genres: showData.genres,
    cast,
  };
}

const app = express();
app.use(cors());

app.use(
  "/graphql",
  graphqlHTTP({
    schema,
    graphiql: true,
  })
);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
