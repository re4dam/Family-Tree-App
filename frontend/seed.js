const GRAPHQL_URL = 'http://backend:5000/graphql';

const REGISTER_MUTATION = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
    }
  }
`;

const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
    }
  }
`;

const SEED_MUTATION = `
  mutation Seed {
    seedSampleData
  }
`;

async function run() {
  const credentials = {
    username: 'admin',
    email: 'admin@example.com',
    password: 'Password123!'
  };

  let token = null;

  console.log('Attempting to register user...');
  try {
    const regRes = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: REGISTER_MUTATION,
        variables: {
          input: {
            username: credentials.username,
            email: credentials.email,
            password: credentials.password
          }
        }
      })
    });
    const regJson = await regRes.json();
    if (regJson.data && regJson.data.register) {
      token = regJson.data.register.token;
      console.log('Registration successful, token retrieved.');
    } else {
      console.log('Registration failed or user already exists. Attempting login...', JSON.stringify(regJson.errors));
    }
  } catch (err) {
    console.error('Registration fetch failed:', err);
  }

  if (!token) {
    console.log('Attempting login...');
    try {
      const loginRes = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: LOGIN_MUTATION,
          variables: {
            input: {
              usernameOrEmail: credentials.username,
              password: credentials.password
            }
          }
        })
      });
      const loginJson = await loginRes.json();
      if (loginJson.data && loginJson.data.login) {
        token = loginJson.data.login.token;
        console.log('Login successful, token retrieved.');
      } else {
        console.error('Login failed:', JSON.stringify(loginJson.errors));
        process.exit(1);
      }
    } catch (err) {
      console.error('Login fetch failed:', err);
      process.exit(1);
    }
  }

  console.log('Sending seedSampleData mutation...');
  try {
    const seedRes = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query: SEED_MUTATION
      })
    });
    const seedJson = await seedRes.json();
    if (seedJson.data && seedJson.data.seedSampleData) {
      console.log('Database successfully seeded with 3-generation family tree data!');
    } else {
      console.error('Seeding mutation failed:', JSON.stringify(seedJson.errors));
      process.exit(1);
    }
  } catch (err) {
    console.error('Seeding fetch failed:', err);
    process.exit(1);
  }
}

run();
