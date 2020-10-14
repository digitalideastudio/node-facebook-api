## Facebook Client for Node

### Installation

```
npm install @digitalideastudio/node-facebook-api
```

### Usage


#### Step 1. Initialization

```
import NodeFacebook from '@digitalideastudio/node-facebook-api';

const fb = new NodeFacebook();
```

#### Step 2. User Consent

```
const url = await fb.getOAuthUrl();

console.log(url); // Send to the frontend so user can see FB OAuth2 Consent window and retrieve a code
```

![OAuth Consent Window](https://github.com/digitalideastudio/node-facebook-api/blob/main/.github/oauth_window.png?)

#### Step 3. Exchange the code to Access Token

```
fb.authenticate(code); // specify the code sent by frontend once user authenticated in FB OAuth2 Consent window
```

#### Ready to use Facebook API

Now you can use any API calls the same you can use on [API Explorer](https://developers.facebook.com/tools/explorer/):

```
fb.get('me');
fb.get('me/videos');
fb.get('me/posts');
fb.get('me', { fields: 'first_name,last_name,email' });

```

#### Support of env vars

As mentioned above, to instantiate NodeFacebook class you can do the following:

```
const fb = new NodeFacebook();
```

This will work when you have the following lines in your .env file (or process.env):

```
FACEBOOK_CLIENT_ID=XXXXXXXXXX
FACEBOOK_CLIENT_SECRET=XXX
FACEBOOK_SCOPE=email,user_birthday,user_location,public_profile,user_friends
FACEBOOK_REDIRECT_URI=http://localhost:4000

FACEBOOK_DEBUG=true # optional
FACEBOOK_VERSION=8.0 # optional
FACEBOOK_MOBILE=true # optional
```

Alternatively, you can pass these options directly to the constructor:

```
const fb = new NodeFacebook({
  client_id: 'XXXXXXX',
  client_secret: 'XXXXXXXXX',
  redirect_uri: 'http://localhost:4000',
  scope: 'email,user_birthday,user_location,public_profile,user_friends',

  // Optional
  mobile: true,
  version: '8.0',
  debug: true,
});
```

