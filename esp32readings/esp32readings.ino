int sensor = 34;

void setup(){
    Serial.begin(115200);
}

void loop(){
    int value = analogRead(sensor);

    Serial.println(value);

    delay(100);
}