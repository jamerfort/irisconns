FROM python:3

WORKDIR /usr/src/app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY irisconns.py .
COPY irispy_image/demo.py .

CMD [ "python", "-c", "print('Built irispy image')" ]
