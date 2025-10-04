FROM node:24

WORKDIR /home/node/app

COPY package.json ./

# NPM Install
# Make this look like ubuntu
RUN npm install && \
    sed -i 's/VERSION_ID=.*/VERSION_ID=22.04/g; s/ID=debian/ID=ubuntu/g;' /etc/os-release 

COPY irisconns.js .
COPY irisjs_image/demo.js .


CMD [ "node", "-e", "console.log('Built irisjs image')" ]
