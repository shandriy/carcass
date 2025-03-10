#!/bin/sh

first=true

rm results

for arg; do
  if [ -n $first ]; then
    first=""

    cp "index/3/$arg" results
  else
    while read line; do
      if [ -n "$(grep -xF "$line" results)" ]; then
        printf "%s\n" "$line" >> "_results"
      fi
    done < "index/3/$arg"

    rm results
    mv "_results" results
  fi
done

mv results "_results"

while read line; do
  printf "%s\n" $(printf %s "$line" | base64 -d) >> results
done < "_results"

rm "_results"

cat results | sort -u > results
