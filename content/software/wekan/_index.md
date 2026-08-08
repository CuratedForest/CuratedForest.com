For the MongoDB information, checkout [Mongo DB](Mongo%20DB.md)

By default, DB name is test

  

# Automation

### Token expiration longer than 3 months

  

Add this env var to the wekan deployment:

```

- name: ACCOUNTS_COMMON_LOGIN_EXPIRATION_IN_DAYS

value: "10950"

```

Login with

```

curl -v -H "Content-type:application/json" -X POST https://wekan.spencerslab.com/users/login -d '{ "username": "bot", "password": "'$WEKAN_PASSWORD'" }'

```

That'll generate a token with an expiration in 30 years.

  

Finally, remove the added env var.

  
  
  

https://www.mongodb.com/docs/sql-interface/tutorials/connect-tutorial/

## Initial try, was wrong

To update token, ran

```

db.users.updateOne(

{ username: "bot" },

{

$set: {

"services.resume.loginTokens.$[].when": ISODate("2099-01-01T00:00:00.000Z")

}

}

)

```

But this didn't work I think because the expiration is in the token so the hash breaks.