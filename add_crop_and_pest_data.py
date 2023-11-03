import json
import re
import requests
import sys

from bs4 import BeautifulSoup
from tqdm import tqdm

JSON: list[dict[str, str]] = json.load(open(sys.argv[1]))["Labels"]

UPDATED_JSON: list[dict[str, str]] = []


def get_link(id: str) -> str:
    return f"https://picol.cahnrs.wsu.edu/Search/Details/{id}"


def remove_whitespaces_and_get_array_of_values(value: str) -> list[str]:
    aug_value = re.sub("\n", ";,;", value)
    aug_value = re.sub("\s+", " ", aug_value)
    value_list = aug_value.split(";,;")
    value_list = list(
        filter(
            lambda item: False if re.sub("\s+", "", item) == "" else True, value_list
        )
    )

    return list(
        map(lambda item: re.sub("\s$", "", re.sub("^\s", "", item)), value_list)
    )


def scrape_crops_and_pests():
    for product in tqdm(JSON):
        id = product["Id"]
        detail_url = get_link(id)

        soup = BeautifulSoup(requests.get(detail_url).content, "html.parser")

        # Crops
        element = soup(text=re.compile(r"^Crops$"))[0]
        crops: list[str] = remove_whitespaces_and_get_array_of_values(
            element.find_next("ul").text
        )

        # Pests
        element = soup(text=re.compile(r"^Pests$"))[0]
        pests: list[str] = remove_whitespaces_and_get_array_of_values(
            element.find_next("ul").text
        )

        # Crops and Pests
        element = soup(text=re.compile(r"^Crops and Pests$"))[0]
        crops_and_pests: list[str] = remove_whitespaces_and_get_array_of_values(
            element.find_next("ul").text
        )

        product["Crops"] = crops
        product["Pests"] = pests
        product["Crops_Pests"] = crops_and_pests

        UPDATED_JSON.append(product)


if "__main__" == __name__:
    scrape_crops_and_pests()
    json.dump({"Error": False, "Labels": UPDATED_JSON}, open(sys.argv[1], "w"))
