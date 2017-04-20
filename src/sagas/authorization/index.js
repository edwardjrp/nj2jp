/* eslint-disable no-constant-condition */
import { put, call, take, fork } from 'redux-saga/effects';
import { eventChannel } from 'redux-saga';
import { push } from 'react-router-redux';
import { auth as AuthService } from '../../navigation/routes';
import authActions from '../../redux/auth';
import userActions from '../../redux/user';
import sessionActions from '../../redux/session';

function createAuthChannel(auth) {
  return eventChannel((emitter) => {
    const loggedInHandler = profile => emitter({
      type: 'loggedIn',
      payload: { ...profile },
    });
    const loginFailureHandler = error => emitter({
      type: 'error',
      payload: { ...error },
    });
    const loggedOutHandler = () => emitter({
      type: 'loggedOut',
    });
    auth.on('logged_in', loggedInHandler);
    auth.on('logged_out', loggedOutHandler);
    auth.on('login_failure', loginFailureHandler);
    return _ => _;
  });
}

function* postLoginActions(profile) {
  yield [
    put(userActions.saveProfile(profile)),
    put(authActions.loginSuccess()),
    put(sessionActions.resetPreLoginUrl()),
  ];
}

function* preLoginActions(socialType) {
  yield [
    put(userActions.saveLoginType(socialType)),
    put(authActions.authorizationInProgress()),
    put(sessionActions.savePreloginPage()),
  ];
}

function* socialLogin(socialType) {
  yield call(preLoginActions, socialType);
  yield put(AuthService[socialType]());
}

export function* watchAuthActions() {
  const authChannel = yield call(createAuthChannel, AuthService);
  while (true) {
    const { payload, type } = yield take(authChannel);
    switch (type) {
      case 'loggedIn': yield fork(postLoginActions, payload); break;

      case 'error': yield put(authActions.loginFailure(payload)); break;

      case 'loggedOut': yield [
        put(push('/')),
        put(authActions.loggedOut()),
        put(userActions.removeProfile()),
      ]; break;

      default: throw Error('Saga Login Error');
    }
  }
}

export default function* authorizationSaga() {
  while (true) {
    const { socialType } = yield take('AUTH_SOCIAL_LOGIN');
    yield call(socialLogin, socialType);
  }
}
