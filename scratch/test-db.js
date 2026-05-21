async function run() {
  try {
    const postRes = await fetch('http://localhost:3001/api/db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          usersCount: 10,
          status: 'online',
          usersList: ['Yogesh', 'Admin']
        }
      })
    });
    console.log('POST Response Status:', postRes.status);
    const postJson = await postRes.json();
    console.log('POST Response JSON:', postJson);

    // Test append
    const appendRes = await fetch('http://localhost:3001/api/db/append', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: 'usersList',
        value: 'NewUser'
      })
    });
    const appendJson = await appendRes.json();
    console.log('Append Response JSON:', appendJson);

    // Test get
    const getRes = await fetch('http://localhost:3001/api/db');
    const getJson = await getRes.json();
    console.log('GET Response JSON:', getJson);
  } catch (err) {
    console.error('Test Failed:', err);
  }
}
run();
