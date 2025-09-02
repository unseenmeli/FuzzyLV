import Constants from 'expo-constants';

const ENV = {
  dev: {
    pushServerUrl: 'http://localhost:3000',
  },
  staging: {
    pushServerUrl: 'https://fuzzy-notifications-server.fly.dev',
  },
  prod: {
    pushServerUrl: 'https://fuzzy-notifications-server.fly.dev',
  },
};

const getEnvVars = () => {
  if (__DEV__) {
    return ENV.prod;
  }
  return ENV.prod;
};

export default getEnvVars();