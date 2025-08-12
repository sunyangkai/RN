package com.demo;

public class JsonBuilder {
    private StringBuilder json = new StringBuilder();
    private boolean firstField = true;
    
    public JsonBuilder() {
        json.append("{");
    }
    
    public JsonBuilder add(String key, String value) {
        addCommaIfNeeded();
        json.append("\"").append(key).append("\": \"").append(escapeString(value)).append("\"");
        return this;
    }
    
    public JsonBuilder add(String key, boolean value) {
        addCommaIfNeeded();
        json.append("\"").append(key).append("\": ").append(value);
        return this;
    }
    
    public JsonBuilder add(String key, int value) {
        addCommaIfNeeded();
        json.append("\"").append(key).append("\": ").append(value);
        return this;
    }
    
    public JsonBuilder add(String key, double value) {
        addCommaIfNeeded();
        json.append("\"").append(key).append("\": ").append(value);
        return this;
    }
    
    public JsonBuilder addIfNotNull(String key, String value) {
        if (value != null) {
            add(key, value);
        }
        return this;
    }
    
    public JsonBuilder addObject(String key, Consumer<JsonBuilder> builderConsumer) {
        addCommaIfNeeded();
        json.append("\"").append(key).append("\": ");
        JsonBuilder nestedBuilder = new JsonBuilder();
        builderConsumer.accept(nestedBuilder);
        json.append(nestedBuilder.build());
        return this;
    }
    
    private void addCommaIfNeeded() {
        if (!firstField) {
            json.append(", ");
        }
        firstField = false;
    }
    
    private String escapeString(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\")
                   .replace("\"", "\\\"")
                   .replace("\n", "\\n")
                   .replace("\r", "\\r")
                   .replace("\t", "\\t");
    }
    
    public String build() {
        return json.append("}").toString();
    }
    
    @FunctionalInterface
    public interface Consumer<T> {
        void accept(T t);
    }
}