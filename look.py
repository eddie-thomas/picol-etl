import json

if "__main__" == __name__:
    products: list[dict[str, str]] = json.load(open("./all_product_data.json"))[
        "Labels"
    ]

    origin_keys = [key for key in products[0]]

    all_values: dict[str, set[str]] = {}
    for key in origin_keys:
        all_values[key] = set()

    for product in products:
        for key in origin_keys:
            try:
                value = product[key]
                value_set = all_values[key]
                value_set.add(value)
                all_values[key] = value_set
            except:
                pass
    for key in origin_keys:
        if len(all_values[key]) < 20:
            print(f"{key}: {all_values[key]}\n")

    print(all_values["PesticideTypes"])
