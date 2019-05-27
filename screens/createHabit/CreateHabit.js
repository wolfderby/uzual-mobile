import React from 'react';
import { Switch } from 'react-native';
import FullLoading from '../../components/FullLoading';
import {
  Body,
  Heading,
  Wrapper,
  Row,
  Spacer,
  Scroll,
  Input,
  Button
} from '../../components/styled';
import NavHeader from '../../components/NavHeader';
import { start, end } from '../../utils/dayjs';
import queries from '../habits/queries.gql';
import { v4 as uuid } from 'uuid';

export default class CreateHabit extends React.Component {
  // static navigationOptions = {
  //   header: null
  // };
  constructor(props) {
    super(props);

    const { navigation } = this.props;
    const habit = navigation.getParam('habit', {
      title: '',
      description: '',
      starred: false,
      id: null,
      habits: []
    });

    this.state = {
      ...habit,
      error: null,
      type: habit.id ? 'EDIT' : 'CREATE'
    };
  }

  _change = (type, value) => {
    this.setState({
      [type]: value,
      error: null
    });
  };

  _getErrorMessage = () => {
    const { title, description } = this.state;
    if (!title && !description) {
      return 'Fields are mandatory';
    }
    if (!title) {
      return 'Title is missing';
    }
    if (!description) {
      return 'Description is missing';
    }
  };

  _createHabit = () => {
    const { title, description, starred, id, habits } = this.state;
    const isEditMode = this._isEditMode();
    console.log(isEditMode ? 'edit' : 'create', ' habit');
    if (!title || !description) {
      const error = this._getErrorMessage();
      return this.setState({
        error
      });
    }

    try {
      this.props.createHabit({
        variables: {
          id: isEditMode ? id : '',
          title,
          description,
          starred,
          start,
          end
        },
        optimisticResponse: {
          __typename: 'Mutation',
          createHabit: {
            __typename: 'Habit',
            id: isEditMode ? id : uuid(),
            title,
            description,
            starred,
            habits
          }
        },
        update: (proxy, { data: { createHabit } }) => {
          try {
            const data = proxy.readQuery({
              query: queries.habits,
              variables: { start, end }
            });

            if (isEditMode) {
              const habitIndex = data.habits.findIndex(
                habit => habit.id === id
              );
              data.habits.splice(habitIndex, 1, createHabit);
            } else {
              data.habits.push(createHabit);
            }
            proxy.writeQuery({
              query: queries.habits,
              variables: { start, end },
              data
            });
            // Update the cache and return. This is because maybe the
            // user is offline and so the promise will never be resolved.
            this._goBack();
          } catch (err) {
            console.error(err);
          }
        }
      });
    } catch (err) {
      this.setState({
        error:
          err.graphQLErrors.length > 0
            ? err.graphQLErrors[0].message
            : 'Something went wrong.'
      });
    }
  };

  _isEditMode = () => this.state.type === 'EDIT';

  _goBack = () => this.props.navigation.goBack();

  _renderCreateHabitForm = () => {
    const isEditMode = this._isEditMode();
    const heading = `${isEditMode ? 'EDIT' : 'CREATE'} HABIT`;
    return (
      <Wrapper>
        <Heading left large>
          {heading}
        </Heading>
        <Body left placeholder tiny>
          Title
        </Body>
        <Input
          defaultValue={this.state.title}
          onChangeText={e => this._change('title', e)}
        />
        <Body left placeholder tiny>
          Description
        </Body>
        <Input
          multiline={true}
          defaultValue={this.state.description}
          onChangeText={e => this._change('description', e)}
        />
        <Body left placeholder tiny>
          Favorite Habit?
        </Body>
        <Switch
          value={this.state.starred}
          onValueChange={() => this._change('starred', !this.state.starred)}
          trackColor={this.props.theme.colors.primary}
        />
        <Spacer big>
          {this.state.error && (
            <Body error noMargin>
              {this.state.error}
            </Body>
          )}
        </Spacer>
        <Button onPress={this._createHabit} primary huge>
          <Body white center noMargin>
            {heading}
          </Body>
        </Button>
      </Wrapper>
    );
  };

  render() {
    if (this.props.createHabit.loading) {
      return <FullLoading />;
    }
    return (
      <Scroll>
        <NavHeader onBackPress={this._goBack} />
        {this._renderCreateHabitForm()}
      </Scroll>
    );
  }
}
